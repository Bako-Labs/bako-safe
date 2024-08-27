import {
  type TransactionRequest,
  TransactionResponse,
  bn,
  calculateGasFee,
  hexlify,
} from "fuels";
import { delay } from "../../../test/utils";
import {
  type ITransaction,
  type ITransactionResume,
  type ITransactionService,
  TransactionStatus,
} from "../../api";
import type { Vault } from "../vault/Vault";
import { FAKE_WITNESSES, maxSigners } from "./fee";

export interface BaseTransferLike<T extends TransactionRequest> {
  name: string;
  service?: ITransactionService;
  witnesses: string[];
  transactionRequest: T;
  BakoSafeTransaction?: ITransaction;
  BakoSafeTransactionId?: string;
  vault: Vault;
}

/**
 * `BaseTransfer` are a abstraction of a transaction between safe and fuel
 */
export class BaseTransfer<T extends TransactionRequest> {
  public name!: string;
  public witnesses: string[];
  public BakoSafeTransaction!: ITransaction;
  public transactionRequest: T;
  public BakoSafeTransactionId!: string;

  protected vault!: Vault;
  protected service?: ITransactionService;

  protected constructor({
    vault,
    name,
    transactionRequest,
    service,
    BakoSafeTransaction,
    BakoSafeTransactionId,
  }: BaseTransferLike<T>) {
    this.name = name;
    this.vault = vault;
    this.service = service;
    this.transactionRequest = transactionRequest;
    this.BakoSafeTransaction = BakoSafeTransaction ?? ({} as ITransaction);
    this.BakoSafeTransactionId = BakoSafeTransactionId ?? "";

    this.witnesses = [];
  }

  /**
   * Create the url to consult the fuel block explorer
   *
   * @returns link of transaction block
   */
  public makeBlockUrl(block: string | undefined): string {
    return block
      ? `https://fuellabs.github.io/block-explorer-v2/transaction/${this.getHashTxId()}?providerUrl=${encodeURIComponent(
          this.vault.provider.url,
        )}`
      : "";
  }

  // get trasaction status on bakosafe-api
  // @ts-ignore
  private getStatus(): TransactionStatus {
    // get transaction status on BakoSafeAPI
    // set BakoSafeTransaction status
    return this.BakoSafeTransaction.status;
  }

  // send predicate transaction to chain
  private async sendTransactionToChain(): Promise<TransactionResponse> {
    this.transactionRequest.witnesses = this.witnesses;
    await this.vault.provider.estimatePredicates(this.transactionRequest);
    const encodedTransaction = hexlify(
      this.transactionRequest.toTransactionBytes(),
    );
    const {
      submit: { id: transactionId },
    } = await this.vault.provider.operations.submit({ encodedTransaction });

    return new TransactionResponse(transactionId, this.vault.provider);
  }

  // sync transaction by api status
  // get on api the transaction by id, and recive only the status
  // if status is different of the current status, get the complete transaction on api
  private async syncTrasanction(): Promise<void> {
    if (!this.service) return;
    const currentStatus = await this.service.status(this.BakoSafeTransactionId);
    const isDeprecated = currentStatus !== this.BakoSafeTransaction.status;

    if (!isDeprecated) {
      return;
    }

    this.BakoSafeTransaction = await this.service.findByTransactionID(
      this.BakoSafeTransaction.id,
    );

    return;
  }

  /**
   * Generates and formats the transaction hash of transaction instance
   *
   * @returns Hash of this transaction
   */
  public getHashTxId(): string {
    const txHash = this.transactionRequest.getTransactionId(
      this.vault.provider.getChainId(),
    );
    return txHash.slice(2);
  }

  /**
   * Using BakoSafe auth or default send of predicate, send this transaction to chain
   *
   * @returns an resume for transaction
   */
  public async send(): Promise<ITransactionResume | TransactionResponse> {
    // Default send of predicate transaction
    if (!this.service) {
      return this.sendTransactionToChain();
    }

    await this.syncTrasanction();

    if (this.BakoSafeTransaction.status === TransactionStatus.PENDING_SENDER) {
      await this.service.send(this.BakoSafeTransactionId);
      await this.syncTrasanction();
    }

    return new TransactionResponse(this.getHashTxId(), this.vault.provider);
  }

  static async prepareTransaction<T extends TransactionRequest>(
    vault: Vault,
    transactionRequest: T,
  ): Promise<T> {
    // Estimate the gas usage for the predicate
    const predicateGasUsed = await vault.maxGasUsed();
    let txRequest = transactionRequest;

    const transactionCost = await vault.provider.getTransactionCost(txRequest);
    txRequest.maxFee = transactionCost.maxFee;
    txRequest = await vault.fund(txRequest, transactionCost);

    // Calculate the total gas usage for the transaction
    let totalGasUsed = bn(0);
    txRequest.inputs.forEach((input) => {
      if ("predicate" in input && input.predicate) {
        input.witnessIndex = 0;
        input.predicateGasUsed = undefined;
        totalGasUsed = totalGasUsed.add(predicateGasUsed);
      }
    });

    const witnesses = Array.from(txRequest.witnesses);
    const fakeSignatures = Array.from(
      { length: maxSigners },
      () => FAKE_WITNESSES,
    );
    txRequest.witnesses.push(...fakeSignatures);

    // Estimate the max fee for the transaction and calculate fee difference
    const { gasPriceFactor } = vault.provider.getGasConfig();
    const { maxFee, gasPrice } = await vault.provider.estimateTxGasAndFee({
      transactionRequest: txRequest,
    });

    const predicateSuccessFeeDiff = calculateGasFee({
      gas: totalGasUsed,
      priceFactor: gasPriceFactor,
      gasPrice,
    });

    txRequest.maxFee = maxFee.add(predicateSuccessFeeDiff);

    // Attach missing inputs (including estimated predicate gas usage) / outputs to the request
    await vault.provider.estimateTxDependencies(txRequest);

    txRequest.witnesses = witnesses;

    return txRequest;
  }

  /**
   * Promise to return result of function
   *
   * todo: monitore send with an socket server
   * Connect to api socket using name: [TRANSACTION_WAIT]:${transactionId}
   * Await an message on event [TRANSACTION_WAIT]:${transactionId}
   * and resolves a promise returns a result (returned on content of message)
   *
   * @returns an resume for transaction
   */
  public async wait(): Promise<ITransactionResume> {
    if (!this.service) {
      throw Error("Implement this.");
    }

    await this.syncTrasanction();

    if (this.BakoSafeTransaction.status === TransactionStatus.PENDING_SENDER) {
      await this.service.send(this.BakoSafeTransactionId);
      await this.syncTrasanction();
    }

    const wait =
      this.BakoSafeTransaction.status === TransactionStatus.PROCESS_ON_CHAIN ||
      this.BakoSafeTransaction.status === TransactionStatus.AWAIT_REQUIREMENTS;

    if (wait) {
      await delay(1000);
      return this.wait();
    }

    return this.BakoSafeTransaction.resume;
  }
}
