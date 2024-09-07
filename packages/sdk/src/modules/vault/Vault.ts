import {
  bn,
  BN,
  Address,
  hexlify,
  arrayify,
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
} from 'fuels';

import {
  Asset,
  makeSigners,
  ITransferAsset,
  FAKE_WITNESSES,
  makeHashPredicate,
} from '../../utils';

import { VaultConfigurable } from './types';

import { BakoProvider } from '../provider';

import { BakoPredicate } from '../../sway/predicates';
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
   * @returns {Promise<{ tx: TransactionRequestLike, hashTxId: string }>} The prepared transaction and its hash.
   * @throws Will throw an error if the transaction type is not implemented.
   */
  async BakoTransfer(tx: TransactionRequestLike): Promise<{
    tx: TransactionRequestLike;
    hashTxId: string;
  }> {
    let result: TransactionRequest;
    switch (tx.type) {
      case TransactionType.Script:
        const script = new ScriptTransactionRequest(tx);
        result = await this.prepareTransaction(script);
        return {
          tx: script,
          hashTxId: script
            .getTransactionId(this.provider.getChainId())
            .slice(2),
        };

      case TransactionType.Create:
        const create = new CreateTransactionRequest(tx);
        result = await this.prepareTransaction(create);
        return {
          tx: create,
          hashTxId: create
            .getTransactionId(this.provider.getChainId())
            .slice(2),
        };

      default:
        throw new Error('Not implemented');
    }
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
      const txHash = await txRequest.getTransactionId(
        this.provider.getChainId(),
      );

      return await this.provider.send(txHash);
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

    const witnesses = Array.from(transactionRequest.witnesses);
    const fakeSignatures = Array.from(
      { length: this.maxSigners },
      () => FAKE_WITNESSES,
    );

    transactionRequest.witnesses.push(...fakeSignatures);

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

    await this.provider.estimateTxDependencies(transactionRequest);
    transactionRequest.witnesses = witnesses;

    return transactionRequest;
  }

  /**
   * Saves the vault's predicate to the blockchain if using a BakoProvider.
   *
   * @returns {Promise<any>} The result of the save operation.
   * @throws Will throw an error if the provider is not a BakoProvider.
   */
  async save() {
    if (this.provider instanceof BakoProvider) {
      return await this.provider?.savePredicate(this);
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
  static async fromAddress(reference: string, provider: BakoProvider) {
    const recoveredPredicate =
      await provider?.findPredicateByAddress(reference);
    const predicate = new Vault(
      provider,
      JSON.parse(recoveredPredicate.configurable),
    );

    return predicate;
  }

  /**
   * Retrieves a transaction associated with a given hash using the vault's provider.
   *
   * @param {string} hash - The transaction hash.
   * @returns {Promise<any>} The transaction data.
   * @throws Will throw an error if the provider is not a BakoProvider.
   */
  async transactionFromHash(hash: string) {
    if (this.provider instanceof BakoProvider) {
      return await this.provider?.findTransaction(hash, this);
    }

    throw new Error('Use a VaultProvider to consume this method');
  }

  /**
   * Creates a new transaction script using the vault resources.
   *
   * @param {ITransferAsset[]} assets - The transaction assets to send.
   * @returns {Promise<{ tx: TransactionRequestLike, hashTxId: string }>} The prepared transaction and its hash.
   */
  async transaction(assets: ITransferAsset[]): Promise<{
    tx: TransactionRequestLike;
    hashTxId: string;
  }> {
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

    tx.inputs?.forEach((input) => {
      if (
        input.type === InputType.Coin &&
        hexlify(input.owner) === this.address.toB256()
      ) {
        input.predicate = arrayify(this.bytes);
      }
    });

    let trancation = await this.prepareTransaction(tx);

    if (this.provider instanceof BakoProvider) {
      await this.provider.saveTransaction(trancation, this.address.toB256());
    }

    return {
      tx: trancation,
      hashTxId: trancation
        .getTransactionId(this.provider.getChainId())
        .slice(2),
    };
  }

  public get provider(): Provider | BakoProvider {
    return this.__provider;
  }
}
