import {
  bn,
  hexlify,
  ScriptTransactionRequest,
  TransactionRequest,
  transactionRequestify,
  TransactionResponse,
} from 'fuels';
import {
  ITransaction,
  ITransactionResume,
  ITransactionService,
  TransactionStatus,
} from '../api';
import {
  ECreationTransactiontype,
  TransferConstructor,
  TransferFactory,
} from './types';
import { Vault } from '../vault';
import { delay } from '../../test/utils';
import { identifyCreateTransactionParams } from './helpers';

/**
 * `Transfer` are extension of ScriptTransactionRequest, to create and send transactions
 */
export class Transfer {
  public name!: string;
  public witnesses!: string[];
  public BSAFEScript: ScriptTransactionRequest;
  public BSAFETransaction!: ITransaction;
  public transactionRequest: TransactionRequest;
  public BSAFETransactionId!: string;

  private vault!: Vault;
  private service?: ITransactionService;

  protected constructor({
    vault,
    name,
    witnesses,
    transactionRequest,
    BSAFEScript,
    service,
    BSAFETransaction,
    BSAFETransactionId,
  }: TransferConstructor) {
    this.name = name!;
    this.vault = vault;
    this.service = service;
    this.witnesses = witnesses!;
    this.BSAFEScript = BSAFEScript;
    this.transactionRequest = transactionRequest;
    this.BSAFETransaction = BSAFETransaction!;
    this.BSAFETransactionId = BSAFETransactionId!;
  }

  /**
   * Create a new transaction instance
   *
   * @param {TransferFactory} param - TransferFactory params
   *        @param {string | ITransfer | ITransaction} transfer - Transaction ID or ITransfer or ITransaction
   *        @param {IBSAFEAuth} auth - BSAFEAuth instance
   *        @param {Vault} vault - Vault instance
   *        @param {boolean} isSave - Save transaction on BSAFEAPI
   * @returns return a new Transfer instance
   */
  public static async instance(param: TransferFactory) {
    const item = await identifyCreateTransactionParams(param);

    switch (item.type) {
      case ECreationTransactiontype.IS_OLD: {
        const { payload } = item;
        return new Transfer(payload);
      }
      case ECreationTransactiontype.IS_NEW: {
        const { payload } = item;
        return new Transfer(payload);
      }
      case ECreationTransactiontype.IS_SCRIPT: {
        const { payload } = item;
        return new Transfer(payload);
      }
      default:
        throw new Error('Invalid param type to create a transfer');
    }
  }

  /**
   * Create the url to consult the fuel block explorer
   *
   * @returns link of transaction block
   */
  public makeBlockUrl(block: string | undefined) {
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
  public getHashTxId() {
    const txHash = this.transactionRequest.getTransactionId(
      this.vault.provider.getChainId(),
    );
    return txHash.slice(2);
  }

  /**
   * Configure outputs and parameters of transaction instance.
   *
   * @returns this transaction configured and your hash
   */

  /**
   * Using BSAFEauth or default send of predicate, send this transaction to chain
   *
   * @returns an resume for transaction
   */
  public async send() {
    if (!this.service) {
      const tx: TransactionRequest = transactionRequestify(this.BSAFEScript!);
      const tx_est = await this.vault.provider.estimatePredicates(tx);
      const encodedTransaction = hexlify(tx_est.toTransactionBytes());
      const {
        submit: { id: transactionId },
      } = await this.vault.provider.operations.submit({ encodedTransaction });
      return new TransactionResponse(transactionId, this.vault.provider);
    }

    this.BSAFETransaction = await this.service.findByTransactionID(
      this.BSAFETransactionId,
    );
    switch (this.BSAFETransaction.status) {
      case TransactionStatus.PENDING_SENDER:
        await this.service.send(this.BSAFETransactionId);
        break;

      case TransactionStatus.PROCESS_ON_CHAIN:
        return await this.wait();

      case TransactionStatus.FAILED || TransactionStatus.SUCCESS:
        break;

      default:
        break;
    }
    return {
      ...this.BSAFETransaction.resume,
      bsafeID: this.BSAFETransactionId,
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
  public async wait() {
    if (!this.service) {
      throw Error('Implement this.');
    }

    let transaction = await this.service.findByTransactionID(
      this.BSAFETransactionId,
    );
    while (
      transaction.status !== TransactionStatus.SUCCESS &&
      transaction.status !== TransactionStatus.FAILED
    ) {
      await delay(this.vault.transactionRecursiveTimeout); // todo: make time to dynamic
      transaction = await this.service.findByTransactionID(
        this.BSAFETransactionId,
      );

      if (transaction.status == TransactionStatus.PENDING_SENDER)
        await this.send();

      if (transaction.status == TransactionStatus.PROCESS_ON_CHAIN)
        await this.service.verify(this.BSAFETransactionId);
    }

    const result: ITransactionResume = {
      ...transaction.resume,
      status: transaction.status,
    };
    return result;
  }
}
