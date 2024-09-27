import {
  bn,
  BN,
  Address,
  arrayify,
  hexlify,
  Provider,
  Predicate,
  InputType,
  ZeroBytes32,
  calculateGasFee,
  TransactionType,
  TransactionRequest,
  TransactionResponse,
  transactionRequestify,
  TransactionRequestLike,
  CreateTransactionRequest,
  ScriptTransactionRequest,
  UploadTransactionRequest,
  UpgradeTransactionRequest,
} from 'fuels';

import {
  Asset,
  makeSigners,
  FAKE_WITNESSES,
  makeHashPredicate,
} from '../../utils';

import { VaultConfigurable, VaultTransaction } from './types';

import { ICreateTransactionPayload, PredicateResponse } from '../service';

import { BakoProvider } from '../provider';

import { BakoPredicate } from '../../sway';

/**
 * The `Vault` class is an extension of `Predicate` that manages transactions,
 * sending operations, and includes additional functionality specific to
 * handling multi-signature and predicate-based wallets.
 *
 * @extends Predicate
 */
export class Vault extends Predicate<[]> {
  readonly bakoFee = bn(0);
  readonly maxSigners = 10;
  readonly configurable: VaultConfigurable;

  __provider: Provider | BakoProvider;

  /**
   * Constructs a new `Vault` instance.
   *
   * @param {Provider | BakoProvider} provider - The provider instance
   * @param {VaultConfigurable} configurable - The configuration for the vault, including signature requirements.
   */
  constructor(
    provider: Provider | BakoProvider,
    configurable: VaultConfigurable,
  ) {
    const conf = Vault.makePredicate(configurable);
    super({
      abi: BakoPredicate.abi,
      bytecode: arrayify(BakoPredicate.bytecode),
      provider: provider,
      configurableConstants: conf,
    });

    this.configurable = conf;
    this.__provider = provider;
  }

  /**
   * Creates the configuration object for the predicate based on vault parameters.
   *
   * @param {VaultConfigurable} params - The signature requirements and predicate hash.
   * @returns {VaultConfigurable} A formatted object to instantiate a new predicate.
   */
  private static makePredicate(params: VaultConfigurable): VaultConfigurable {
    const { SIGNATURES_COUNT, SIGNERS, HASH_PREDICATE } = params;
    return {
      SIGNATURES_COUNT,
      SIGNERS: makeSigners(SIGNERS),
      HASH_PREDICATE: HASH_PREDICATE ?? makeHashPredicate(),
    };
  }

  /**
   * Prepares a transaction for the vault by including the fee configuration and predicate data.
   *
   * @param {TransactionRequestLike} tx - The transaction request.
   * @param {ICreateTransactionPayload} options - Additional options for the transaction.
   * @returns {Promise<{ tx: TransactionRequest, hashTxId: string }>} The prepared transaction and its hash.
   * @throws Will throw an error if the transaction type is not implemented.
   */
  async BakoTransfer(
    tx: TransactionRequestLike,
    options?: Pick<ICreateTransactionPayload, 'name'>,
  ): Promise<{
    tx: TransactionRequest;
    hashTxId: string;
  }> {
    let result: TransactionRequest = transactionRequestify(tx);
    result = await this.prepareTransaction(result);

    if (this.provider instanceof BakoProvider) {
      await this.provider.saveTransaction(result, {
        name: options?.name,
        predicateAddress: this.address.toB256(),
      });
    }

    return {
      tx: result,
      hashTxId: result.getTransactionId(this.provider.getChainId()).slice(2),
    };
  }

  /**
   * Sends a transaction to the blockchain using the vault resources.
   *
   * @param {TransactionRequestLike} tx - The transaction request to send.
   * @returns {Promise<TransactionResponse>} The response from the blockchain.
   */
  async send(tx: TransactionRequestLike): Promise<TransactionResponse> {
    const txRequest = transactionRequestify(tx);

    if (this.provider instanceof BakoProvider) {
      const txHash = txRequest.getTransactionId(this.provider.getChainId());

      return this.provider.send(txHash);
    }

    await this.provider.estimatePredicates(txRequest);
    const encodedTransaction = hexlify(txRequest.toTransactionBytes());
    const {
      submit: { id: transactionId },
    } = await this.provider.operations.submit({ encodedTransaction });
    return new TransactionResponse(transactionId, this.provider);
  }

  /**
   * Calculates the maximum gas used by a transaction.
   *
   * @returns {Promise<BN>} The maximum gas used in the predicate transaction.
   */
  public async maxGasUsed(): Promise<BN> {
    const request = new ScriptTransactionRequest();

    const vault = new Vault(this.provider, {
      SIGNATURES_COUNT: this.maxSigners,
      SIGNERS: Array.from({ length: this.maxSigners }, () => ZeroBytes32),
      HASH_PREDICATE: ZeroBytes32,
    });

    request.addCoinInput({
      id: ZeroBytes32,
      assetId: ZeroBytes32,
      amount: bn(),
      owner: vault.address,
      blockCreated: bn(),
      txCreatedIdx: bn(),
    });

    vault.populateTransactionPredicateData(request);
    Array.from({ length: this.maxSigners }, () =>
      request.addWitness(FAKE_WITNESSES),
    );

    const transactionCost = await vault.getTransactionCost(request);
    await vault.fund(request, transactionCost);
    await vault.provider.estimatePredicates(request);
    const input = request.inputs[0];
    if ('predicate' in input && input.predicate) {
      return bn(input.predicateGasUsed);
    }

    return bn();
  }

  /**
   * Prepares a transaction by estimating gas usage, calculating fees, and adjusting transaction parameters.
   *
   * @template T - The type of the transaction request, extending the base `TransactionRequest` type.
   * @param {T} transactionRequest - The transaction request to prepare.
   * @returns {Promise<T>} The prepared transaction request.
   */
  public async prepareTransaction<T extends TransactionRequest>(
    transactionRequest: T,
  ): Promise<T> {
    const predicateGasUsed = await this.maxGasUsed();

    const witnesses = Array.from(transactionRequest.witnesses);
    const fakeSignatures = Array.from(
      { length: this.maxSigners },
      () => FAKE_WITNESSES,
    );
    transactionRequest.witnesses.push(...fakeSignatures);

    const transactionCost = await this.getTransactionCost(transactionRequest);
    transactionRequest.maxFee = transactionCost.maxFee;
    transactionRequest = await this.fund(transactionRequest, transactionCost);

    let totalGasUsed = bn(0);
    transactionRequest.inputs.forEach((input) => {
      if ('predicate' in input && input.predicate) {
        input.witnessIndex = 0;
        input.predicateGasUsed = undefined;
        totalGasUsed = totalGasUsed.add(predicateGasUsed);
      }
    });

    const { gasPriceFactor } = this.provider.getGasConfig();
    const { maxFee, gasPrice } = await this.provider.estimateTxGasAndFee({
      transactionRequest,
    });

    const predicateSuccessFeeDiff = calculateGasFee({
      gas: totalGasUsed,
      priceFactor: gasPriceFactor,
      gasPrice,
    });

    transactionRequest.maxFee = maxFee.add(predicateSuccessFeeDiff);

    console.log('SDK', transactionRequest);

    await this.provider.estimateTxDependencies(transactionRequest);
    transactionRequest.witnesses = witnesses;

    return transactionRequest;
  }

  /**
   * Saves the vault's predicate to the blockchain if using a BakoProvider.
   *
   * @returns {Promise<PredicateResponse>} The result of the save operation.
   * @throws {Error} Will throw an error if the provider is not a BakoProvider.
   */
  async save(
    params: {
      name?: string;
    } = {},
  ): Promise<PredicateResponse> {
    if (this.provider instanceof BakoProvider) {
      return this.provider.savePredicate({ ...this, ...params });
    }

    throw new Error('Use a VaultProvider to consume this method');
  }

  /**
   * Recovers a `Vault` instance from a predicate address.
   *
   * @param {string} reference - The address of the predicate to recover.
   * @param {BakoProvider} provider - The provider instance used to recover the predicate.
   * @returns {Promise<Vault>} A `Vault` instance recovered from the address.
   */
  static async fromAddress(
    reference: string,
    provider: BakoProvider,
  ): Promise<Vault> {
    const { configurable } = await provider.findPredicateByAddress(reference);
    return new Vault(provider, configurable);
  }

  /**
   * Retrieves a transaction associated with a given hash using the vault's provider.
   *
   * @param {string} hash - The transaction hash.
   * @returns {Promise<any>} The transaction data.
   * @throws {Error} Will throw an error if the provider is not a BakoProvider.
   */
  async transactionFromHash(hash: string) {
    if (this.provider instanceof BakoProvider) {
      return this.provider.findTransaction(hash, this);
    }

    throw new Error('Use a VaultProvider to consume this method');
  }

  /**
   * Creates a new transaction script using the vault resources.
   *
   * @param {ITransferAsset[]} assets - The transaction assets to send.
   * @returns {Promise<{ tx: TransactionRequest, hashTxId: string }>} The prepared transaction and its hash.
   */
  async transaction(params: VaultTransaction): Promise<{
    tx: TransactionRequest;
    hashTxId: string;
  }> {
    const { assets } = params;
    const tx = new ScriptTransactionRequest();

    const outputs = Asset.assetsGroupByTo(assets);
    const coins = Asset.assetsGroupById(assets);

    const transactionCoins = Object.entries(coins).map(([assetId, amount]) => ({
      assetId,
      amount,
    }));

    tx.addResources(await this.getResourcesToSpend(transactionCoins));
    Object.entries(outputs).map(([, value]) => {
      tx.addCoinOutput(
        Address.fromString(value.to),
        value.amount,
        value.assetId,
      );
    });
    this.populateTransactionPredicateData(tx);

    return this.BakoTransfer(tx, { name: params.name });
  }

  public get provider(): Provider | BakoProvider {
    return this.__provider;
  }

  public set provider(provider: Provider | BakoProvider) {
    this.__provider = provider;
  }
}
