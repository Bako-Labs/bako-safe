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

import { PredicateAbi__factory } from '../../sway/predicates';

import {
  Asset,
  ITransferAsset,
  FAKE_WITNESSES,
  makeHashPredicate,
  makeSigners,
} from '../../utils';

/**
 * `Vault` are extension of predicates, to manager transactions, and sends.
 */
export class Vault extends Predicate<[]> {
  readonly maxSigners = 10;
  public version?: string;

  constructor(
    provider: Provider,
    configurable: {
      SIGNATURES_COUNT: number;
      SIGNERS: string[];
      HASH_PREDICATE?: string;
    },
  ) {
    super({
      abi: PredicateAbi__factory.abi,
      bytecode: arrayify(PredicateAbi__factory.bin),
      provider: provider,
      configurableConstants: Vault.makePredicate(configurable),
    });
  }

  /**
   * Make configurable of predicate
   *
   * @param {IConfVault} configurable - The parameters of signature requirements.
   * @returns an formatted object to instance a new predicate
   */
  private static makePredicate({
    SIGNATURES_COUNT,
    SIGNERS,
    HASH_PREDICATE,
  }: {
    SIGNATURES_COUNT: number;
    SIGNERS: string[];
    HASH_PREDICATE?: string;
  }): { [key: string]: any } {
    return {
      SIGNATURES_COUNT,
      SIGNERS: makeSigners(SIGNERS),
      HASH_PREDICATE: HASH_PREDICATE ?? makeHashPredicate(),
    };
  }

  async BakoTransfer(tx: TransactionRequestLike): Promise<{
    tx: TransactionRequestLike;
    hashTxId: string;
  }> {
    switch (tx.type) {
      case TransactionType.Script:
        let script = new ScriptTransactionRequest(tx);
        script = await this.prepareTransaction(script);
        return {
          tx: script,
          hashTxId: script
            .getTransactionId(this.provider.getChainId())
            .slice(2),
        };

      case TransactionType.Create:
        let create = new CreateTransactionRequest(tx);
        create = await this.prepareTransaction(create);
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

  /// TRANSFERS
  async BakoFormatTransfer(assets: ITransferAsset[]): Promise<{
    tx: TransactionRequestLike;
    hashTxId: string;
  }> {
    const tx = new ScriptTransactionRequest();

    const outputs = Asset.assetsGroupByTo(assets);
    const coins = Asset.assetsGroupById(assets);

    const transactionCoins = Asset.addTransactionFee(
      coins,
      bn(0),
      this.provider.getBaseAssetId(),
    );

    const _coins = await this.getResourcesToSpend(transactionCoins);

    tx.addResources(_coins);
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

    return {
      tx: trancation,
      hashTxId: trancation
        .getTransactionId(this.provider.getChainId())
        .slice(2),
    };
  }

  async sendTransactionToChain(
    tx: TransactionRequestLike,
  ): Promise<TransactionResponse> {
    // this.transactionRequest.witnesses = this.witnesses;
    const txRequest = transactionRequestify(tx);
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

    const transactionCost = await vault.provider.getTransactionCost(request);
    await vault.fund(request, transactionCost);
    await vault.provider.estimatePredicates(request);
    const input = request.inputs[0];
    if ('predicate' in input && input.predicate) {
      return bn(input.predicateGasUsed);
    }

    return bn();
  }

  public async prepareTransaction<T extends TransactionRequest>(
    transactionRequest: T,
  ): Promise<T> {
    // Estimate the gas usage for the predicate
    const predicateGasUsed = await this.maxGasUsed();

    const transactionCost =
      await this.provider.getTransactionCost(transactionRequest);
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
}
