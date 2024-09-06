import {
  Address,
  arrayify,
  BN,
  bn,
  calculateGasFee,
  CreateTransactionRequest,
  hexlify,
  InputType,
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

import { BakoPredicate } from '../../sway/predicates';

import {
  Asset,
  ITransferAsset,
  FAKE_WITNESSES,
  makeHashPredicate,
  makeSigners,
} from '../../utils';
import { VaultConfigurable } from './types';
import { BakoProvider } from '../provider';

// todo:
//  - rename methdos of transactions -> .transaction(), .fromAssets(), .fromHash()
//  - rename methods of predicates -> .predicate(), .fromAddress(), .fromId()
//  - think about the save of the vault, .store() -> .save()
//  - move fee methods to the provider -> think about, because all peoples need this, when don`t use bako ecossystem

/**
 * `Vault` are extension of predicates, to manager transactions, and sends.
 */
export class Vault extends Predicate<[]> {
  readonly bakoFee = bn(0);
  readonly maxSigners = 10;
  readonly configurable: VaultConfigurable;

  __provider: Provider | BakoProvider;

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
    //we need subscribe to the provider, bucause this prop is included on Address and vault exnteds address, and can`t set the provider different from the address
    this.__provider = provider;
  }

  /**
   * Make configurable of predicate
   *
   * @param {IConfVault} params - The parameters of signature requirements.
   * @returns an formatted object to instance a new predicate
   */
  private static makePredicate(params: VaultConfigurable) {
    const { SIGNATURES_COUNT, SIGNERS, HASH_PREDICATE } = params;
    return {
      SIGNATURES_COUNT,
      SIGNERS: makeSigners(SIGNERS),
      HASH_PREDICATE: HASH_PREDICATE ?? makeHashPredicate(),
    };
  }

  /**
   * Using the vault, include the fee config in the transaction request.
   *
   *
   * @param {TransactionRequest} tx - The transaction to include the fee.
   * @returns {Promise<{
   *  tx: TransactionRequestLike,
   *  hashTxId: string,
   * }>} TransactionRequestLike and hashTxId
   *
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
        // await this.store
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
   * Using the vault, send a transaction to the chain.
   *
   * @param tx {TransactionRequestLike} - The transaction to send.
   * @returns {Promise<TransactionResponse>} TransactionResponse
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
   * @returns {Promise<BN>} Maximum gas used in the predicate.
   */
  public async maxGasUsed(): Promise<BN> {
    const request = new ScriptTransactionRequest();

    const vault = new Vault(this.provider, {
      SIGNATURES_COUNT: this.maxSigners,
      SIGNERS: Array.from({ length: this.maxSigners }, () => ZeroBytes32),
      HASH_PREDICATE: ZeroBytes32,
    });

    // Add fake input
    request.addCoinInput({
      id: ZeroBytes32,
      assetId: ZeroBytes32,
      amount: bn(),
      owner: vault.address,
      blockCreated: bn(),
      txCreatedIdx: bn(),
    });

    // Populate the  transaction inputs with predicate data
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
   *
   * @template T - The type of the transaction request, extending the base `TransactionRequest` type.
   * @param transactionRequest - The transaction request containing the details to be processed.
   * @returns A promise that resolves with the prepared transaction request of type `T`.
   */
  public async prepareTransaction<T extends TransactionRequest>(
    transactionRequest: T,
  ): Promise<T> {
    // Estimate the gas usage for the predicate
    const predicateGasUsed = await this.maxGasUsed();

    const transactionCost = await this.getTransactionCost(transactionRequest);
    transactionRequest.maxFee = transactionCost.maxFee;
    transactionRequest = await this.fund(transactionRequest, transactionCost);

    // Calculate the total gas usage for the transaction
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

    // Estimate the max fee for the transaction and calculate fee difference
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

    // Attach missing inputs (including estimated predicate gas usage) / outputs to the request
    await this.provider.estimateTxDependencies(transactionRequest);
    transactionRequest.witnesses = witnesses;

    return transactionRequest;
  }

  public get provider(): Provider | BakoProvider {
    return this.__provider;
  }

  async save() {
    // todo: reuse this validation
    if (this.provider instanceof BakoProvider) {
      return await this.provider?.savePredicate(this);
    }

    throw new Error('Use a VaultProvider to consume this method');
  }

  static async fromAddress(reference: string, provider: BakoProvider) {
    const recoveredPredicate =
      await provider?.findPredicateByAddress(reference);
    const predicate = new Vault(
      provider,
      JSON.parse(recoveredPredicate.configurable), // move this parse to the service
    );

    return predicate;
  }

  async transactionFromHash(hash: string) {
    if (this.provider instanceof BakoProvider) {
      return await this.provider?.findTransaction(hash, this);
    }

    throw new Error('Use a VaultProvider to consume this method');
  }

  /**
   * Create a new transactionScript using the vault resources.
   *
   * @param {ITransferAsset[]} assets - The transaction to send.
   * @returns {Promise<{
   *  tx: TransactionRequestLike,
   *  hashTxId: string,
   * }>} TransactionResponse
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
}
