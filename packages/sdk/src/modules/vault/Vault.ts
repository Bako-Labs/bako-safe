import {
  Address,
  arrayify,
  bn,
  BN,
  calculateGasFee,
  GetAddressTypeResponse,
  hexlify,
  Predicate,
  Provider,
  ScriptTransactionRequest,
  TransactionRequest,
  transactionRequestify,
  TransactionRequestLike,
  TransactionResponse,
  TransactionType,
  ZeroBytes32,
} from 'fuels';

import { VaultConfigurable, VaultTransaction, VaultConfig } from './types';
import {
  FAKE_WITNESSES,
  parseConfig,
  assembleTransferToContractScript,
} from './utils';

import {
  ICreateTransactionPayload,
  PredicateResponse,
} from '../provider/services';

import { BakoProvider } from '../provider';
import {
  CompatibilityService,
  VaultAssetService,
  VaultTransactionService,
} from './services';
import { VaultConfigurationFactory } from './factory';
import { Asset } from './assets';
import { EncodingService, SignatureService, type SigLoose } from '../coders';

import partition from 'lodash.partition';

/**
 * The `Vault` class is an extension of `Predicate` that manages transactions,
 * sending operations, and includes additional functionality specific to
 * handling multi-signature and predicate-based wallets.
 *
 * @extends Predicate
 */
export class Vault extends Predicate<[]> {
  readonly bakoFee = 0;
  readonly maxSigners = 10;
  readonly configurable: VaultConfigurable;
  readonly predicateVersion: string;
  readonly allowedRecipients: GetAddressTypeResponse[] = [
    'Account',
    'Contract',
  ];

  private __provider: Provider | BakoProvider;
  private transactionService: VaultTransactionService;
  private assetService: VaultAssetService;

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
    // Resolve configuration from provider or parameters
    const configuration = Vault.resolveConfiguration(
      provider,
      configurable,
      version,
    );

    super({
      abi: configuration.predicateLoader.abi,
      bytecode: arrayify(configuration.predicateLoader.bytecode),
      provider: provider,
      configurableConstants: configuration.config as Record<string, unknown>,
      data: configuration.data,
    });

    this.predicateVersion = configuration.version;
    this.configurable = {
      ...configuration.config,
      // @ts-ignore
      version: this.predicateVersion,
    };
    this.__provider = provider;

    // Initialize services
    this.transactionService = new VaultTransactionService(this);
    this.assetService = new VaultAssetService(this);
  }

  /**
   * Resolves the configuration for vault creation
   */
  private static resolveConfiguration(
    provider: Provider | BakoProvider,
    configurable?: VaultConfigurable,
    version?: string,
  ) {
    // Try to get configuration from BakoProvider first
    if ('cliAuth' in provider && provider.cliAuth) {
      const config = VaultConfigurationFactory.createFromProvider(
        provider as BakoProvider,
        version,
      );
      if (config) return config;
    }

    // Use provided configuration
    if (!configurable) {
      throw new Error('Vault configurable is required');
    }

    return VaultConfigurationFactory.createConfiguration(configurable, version);
  }

  /**
   * Prepares a transaction for the vault by including the fee configuration and predicate data.
   *
   * @param {TransactionRequestLike} tx - The transaction request.
   * @param {ICreateTransactionPayload} options - Additional options for the transaction.
   * @returns {Promise<{ tx: TransactionRequest, hashTxId: string }>} The prepared transaction and its hash.
   */
  async BakoTransfer(
    tx: TransactionRequestLike,
    options?: Pick<ICreateTransactionPayload, 'name'>,
  ): Promise<{
    tx: TransactionRequest;
    hashTxId: string;
    encodedTxId: string;
  }> {
    const result = await this.transactionService.processBakoTransfer(
      tx,
      options,
    );
    const encodedTxId = EncodingService.encodedMessage(
      result.hashTxId,
      this.predicateVersion,
    );

    return {
      ...result,
      encodedTxId,
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
  public async maxGasUsed() {
    return this.transactionService['calculateMaxGasUsed']();
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

    const { assembledRequest } = await this.provider.assembleTx({
      request: transactionRequest,
      feePayerAccount: this,
    });
    transactionRequest = assembledRequest;

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

    const serializedTxCount = bn(
      transactionRequest.toTransactionBytes().length,
    );
    totalGasUsed = totalGasUsed.add(serializedTxCount.mul(64));

    const predicateSuccessFeeDiff = calculateGasFee({
      gas: totalGasUsed,
      priceFactor: gasPriceFactor,
      gasPrice,
    });

    let baseMaxFee = maxFee;
    if (!originalMaxFee.eq(0) && originalMaxFee.cmp(maxFee) === 1) {
      baseMaxFee = originalMaxFee;
    }

    const maxFeeWithPredicateGas = baseMaxFee.add(predicateSuccessFeeDiff);

    // multiplier -> 2x for regular transactions and 5x for upgrade transactions
    const multiplier =
      transactionRequest.type === TransactionType.Upgrade ? 50 : 14;

    transactionRequest.maxFee = maxFeeWithPredicateGas.mul(multiplier).div(10);

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
   * Encodes a signature according to the vault version.
   *
   * @param walletAddress - Address of the signer who produced the signature.
   * @param signature - The raw or structured signature.
   * @returns Encoded signature string compatible with the vault version.
   */
  public encodeSignature(walletAddress: string, signature: SigLoose) {
    return SignatureService.encode(walletAddress, signature, this.version);
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

  // Factory methods for convenience (delegates to VaultFactory)

  /**
   * Creates a Bako multi-signature vault
   */
  static createBakoVault(
    provider: Provider | BakoProvider,
    config: any,
    version?: string,
  ): Vault {
    return new Vault(provider, config, version);
  }

  /**
   * Creates a Connector vault for external wallet integration
   */
  static createConnectorVault(
    provider: Provider | BakoProvider,
    config: any,
    version?: string,
  ): Vault {
    return new Vault(provider, config, version);
  }

  /**
   * Creates a vault from BakoProvider authentication
   */
  static createFromProvider(provider: BakoProvider, version?: string): Vault {
    if (!('cliAuth' in provider) || !provider.cliAuth) {
      throw new Error('BakoProvider must have authentication configured');
    }
    return new Vault(
      provider,
      provider.cliAuth.configurable,
      version ?? provider.cliAuth.version,
    );
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
   * @param {VaultTransaction} params - The transaction parameters including assets and name.
   * @returns {Promise<{ tx: TransactionRequest, hashTxId: string }>} The prepared transaction and its hash.
   */
  async transaction(params: VaultTransaction): Promise<{
    tx: TransactionRequest;
    hashTxId: string;
    encodedTxId: string;
  }> {
    const { assets } = params;
    const assetsWithAddressType = await Promise.all(
      assets.map(async (asset) => {
        const addressType = await this.provider.getAddressType(asset.to);
        if (!this.allowedRecipients.includes(addressType)) {
          throw new Error(
            `Address ${
              asset.to
            } is not allowed. Allowed types: ${this.allowedRecipients.join(
              ', ',
            )}`,
          );
        }
        return { ...asset, addressType };
      }),
    );

    const tx = new ScriptTransactionRequest();

    const [contractOutputs, otherOutputs] = partition(
      assetsWithAddressType,
      (asset: any) => asset.addressType === 'Contract',
    );

    const outputs = Asset.assetsGroupByTo(otherOutputs);
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

    if (contractOutputs.length > 0) {
      const { script, scriptData } = await assembleTransferToContractScript(
        contractOutputs.map((output: any) => ({
          amount: bn.parseUnits(output.amount),
          assetId: output.assetId,
          contractId: output.to,
        })),
      );

      tx.script = script;
      // @ts-ignore - add custom scriptData
      tx.scriptData = scriptData;
    }

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

  /**
   * Gets the parsed configuration with type information.
   *
   * @returns {VaultConfig} The parsed configuration with type enum.
   */
  public getConfigurable(): VaultConfig {
    return parseConfig(this.configurable);
  }

  /**
   * Checks if a vault configuration is compatible with a specific version.
   *
   * @param config - The vault configuration to check
   * @param version - The predicate version to check compatibility with
   * @returns True if the configuration is compatible with the version
   */
  public static compatible(
    config: VaultConfigurable | string,
    version: string,
  ): boolean {
    return CompatibilityService.isCompatibleSafe(config, version);
  }

  public get provider(): Provider | BakoProvider {
    return this.__provider;
  }

  public set provider(provider: Provider | BakoProvider) {
    this.__provider = provider;
  }
}
