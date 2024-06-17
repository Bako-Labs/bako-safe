import {
  hexlify, ScriptTransactionRequest,
  TransactionRequest,
  TransactionResponse
} from 'fuels';
import {
  ITransaction,
  ITransactionResume,
  ITransactionService,
  TransactionStatus,
} from '../../api';
import { Vault } from '../vault/Vault';
import { delay } from '../../../test/utils';

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
    this.name = name!;
    this.vault = vault;
    this.service = service;
    this.transactionRequest = transactionRequest;
    this.BakoSafeTransaction = BakoSafeTransaction!;
    this.BakoSafeTransactionId = BakoSafeTransactionId!;

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
      : '';
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
    if (!this.service) {
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

    this.BakoSafeTransaction = await this.service.findByTransactionID(
      this.BakoSafeTransactionId,
    );
    switch (this.BakoSafeTransaction.status) {
      case TransactionStatus.PENDING_SENDER:
        await this.service.send(this.BakoSafeTransactionId);
        break;

      case TransactionStatus.PROCESS_ON_CHAIN:
        return await this.wait();

      case TransactionStatus.FAILED || TransactionStatus.SUCCESS:
        break;

      default:
        break;
    }
    return {
      ...this.BakoSafeTransaction.resume,
      BakoSafeID: this.BakoSafeTransactionId,
    };
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
      throw Error('Implement this.');
    }

    let transaction = await this.service.findByTransactionID(
      this.BakoSafeTransactionId,
    );
    while (
      transaction.status !== TransactionStatus.SUCCESS &&
      transaction.status !== TransactionStatus.FAILED
    ) {
      await delay(this.vault.transactionRecursiveTimeout); // todo: make time to dynamic
      transaction = await this.service.findByTransactionID(
        this.BakoSafeTransactionId,
      );

      if (transaction.status == TransactionStatus.PENDING_SENDER)
        await this.send();

      if (transaction.status == TransactionStatus.PROCESS_ON_CHAIN)
        await this.service.verify(this.BakoSafeTransactionId);
    }

    const result: ITransactionResume = {
      ...transaction.resume,
      status: transaction.status,
    };
    return result;
  }
}
