import {
  bn,
  BN,
  Address,
  arrayify,
  hexlify,
  Provider,
  Predicate,
  ZeroBytes32,
  TransactionType,
  calculateGasFee,
  TransactionRequest,
  TransactionResponse,
  transactionRequestify,
  TransactionRequestLike,
  ScriptTransactionRequest,
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
import { loadPredicate } from '../../sway/';

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
  readonly predicateVersion: string;

  __provider: Provider | BakoProvider;

  /**
   * Constructs a new `Vault` instance.
   *
   * @param {Provider | BakoProvider} provider - The provider instance
   * @param {VaultConfigurable} configurable - The configuration for the vault, including signature requirements.
   */
  constructor(provider: BakoProvider);
  constructor(
    provider: Provider | BakoProvider,
    configurable: VaultConfigurable,
    version?: string,
  );
  constructor(
    provider: Provider | BakoProvider,
    configurable?: VaultConfigurable,
    version?: string,
  ) {
    let conf = configurable;

    if ('cliAuth' in provider && provider.cliAuth) {
      conf = provider.cliAuth.configurable;
    }

    if (!conf) {
      throw new Error('Vault configurable is required');
    }

    const BakoPredicateLoader = loadPredicate(provider.url, version);
    const config = Vault.makePredicate(conf);
    super({
      abi: BakoPredicateLoader.abi,
      bytecode: arrayify(BakoPredicateLoader.bytecode),
      provider: provider,
      configurableConstants: config,
    });

    this.predicateVersion = BakoPredicateLoader.version;
    this.configurable = {
      ...config,
      // @ts-ignore
      version: this.predicateVersion,
    };
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

    const chainId = await this.provider.getChainId();

    return {
      tx: result,
      hashTxId: result.getTransactionId(chainId).slice(2),
    };
  }

  /**
   * Sends a transaction with the vault's predicate data.
   *
   * @param {TransactionRequestLike} transactionRequestLike - The transaction request to send.
   * @returns {Promise<TransactionResponse>} The response from the blockchain.
   */
  async sendTransaction(transactionRequestLike: TransactionRequestLike) {
    if ('address' in this.provider.options && this.provider.options.address) {
      const { hashTxId } = await this.BakoTransfer(transactionRequestLike);
      const chainId = await this.provider.getChainId();
      return new TransactionResponse(hashTxId, this.provider, chainId);
    }

    return super.sendTransaction(transactionRequestLike);
  }

  /**
   * Sends a transaction to the blockchain using the vault resources.
   *
   * @param {TransactionRequestLike} tx - The transaction request to send.
   * @returns {Promise<TransactionResponse>} The response from the blockchain.
   */
  async send(tx: TransactionRequestLike): Promise<TransactionResponse> {
    const txRequest = transactionRequestify(tx);
    const chainId = await this.provider.getChainId();
    if (this.provider instanceof BakoProvider) {
      const txHash = txRequest.getTransactionId(chainId);

      return this.provider.send(txHash);
    }

    await this.provider.estimatePredicates(txRequest);
    const encodedTransaction = hexlify(txRequest.toTransactionBytes());

    // const a = await this.provider.getBlobs([]);

    const {
      submit: { id: transactionId },
    } = await this.provider.operations.submit({ encodedTransaction });
    return new TransactionResponse(transactionId, this.provider, chainId);
  }

  /**
   * Calculates the maximum gas used by a transaction.
   *
   * @returns {Promise<BN>} The maximum gas used in the predicate transaction.
   */
  public async maxGasUsed(): Promise<BN> {
    const request = new ScriptTransactionRequest();

    const vault = new Vault(
      this.provider,
      {
        SIGNATURES_COUNT: this.maxSigners,
        SIGNERS: Array.from({ length: this.maxSigners }, () => ZeroBytes32),
        HASH_PREDICATE: ZeroBytes32,
      },
      this.predicateVersion,
    );

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
    const originalMaxFee = transactionRequest.maxFee;
    const predicateGasUsed = await this.maxGasUsed();
    this.populateTransactionPredicateData(transactionRequest);

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

    const { gasPriceFactor } = await this.provider.getGasConfig();
    const { maxFee, gasPrice } = await this.provider.estimateTxGasAndFee({
      transactionRequest,
    });

    const predicateSuccessFeeDiff = calculateGasFee({
      gas: totalGasUsed,
      priceFactor: gasPriceFactor,
      gasPrice,
    });

    const maxFeeWithPredicateGas = maxFee.add(predicateSuccessFeeDiff);

    transactionRequest.maxFee = maxFeeWithPredicateGas.mul(12).div(10);

    if (transactionRequest.type === TransactionType.Upgrade) {
      transactionRequest.maxFee = maxFeeWithPredicateGas.mul(5);
    }

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
      description?: string;
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
    const { configurable, version } =
      await provider.findPredicateByAddress(reference);

    return new Vault(provider, configurable, version);
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
      const request = await this.provider.findTransaction(hash);
      const chainId = await this.provider.getChainId();
      return {
        tx: request,
        hashTxId: request.getTransactionId(chainId).slice(2),
      };
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
    await Promise.all(
      assets.map(async (asset) => {
        const addressType = await this.provider.getAddressType(asset.to);
        if (addressType !== 'Account') {
          throw new Error(`Address ${asset.to} is not an Account`);
        }
      }),
    );

    const tx = new ScriptTransactionRequest();

    const outputs = Asset.assetsGroupByTo(assets);
    const coins = Asset.assetsGroupById(assets);

    const transactionCoins = Object.entries(coins).map(([assetId, amount]) => ({
      assetId,
      amount,
    }));

    const add = await this.getResourcesToSpend(transactionCoins);

    tx.addResources(add);
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

  /**
   * Retrieves the current version of the predicate being used.
   *
   * @returns {string} The version of the predicate.
   */
  public get version(): string {
    return this.predicateVersion;
  }

  public get provider(): Provider | BakoProvider {
    return this.__provider;
  }

  public set provider(provider: Provider | BakoProvider) {
    this.__provider = provider;
  }
}
