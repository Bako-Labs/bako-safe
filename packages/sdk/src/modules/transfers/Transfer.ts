import { TransactionRequest, } from 'fuels';
import {
  ECreationTransactiontype,
  TransferFactory,
} from './types';
import { identifyCreateTransactionParams } from './helpers';
import { BaseTransfer } from './BaseTransfer';

/**
 * `Transfer` are extension of ScriptTransactionRequest, to create and send transactions
 */
export class Transfer extends BaseTransfer<TransactionRequest>{
  /**
   * Create a new transaction instance
   *
   * @param {TransferFactory} param - TransferFactory params
   *        @param {string | ITransfer | ITransaction} transfer - Transaction ID or ITransfer or ITransaction
   *        @param {IBakoSafeAuth} auth - BakoSafeAuth instance
   *        @param {Vault} vault - Vault instance
   *        @param {boolean} isSave - Save transaction on BakoSafeAPI
   * @returns return a new Transfer instance
   */
  public static async instance(param: TransferFactory): Promise<Transfer> {
    const { payload, type } = await identifyCreateTransactionParams(param);

    if (!(type in ECreationTransactiontype)) {
      throw new Error('Invalid param type to create a transfer');
    }

    return new Transfer(payload);
  }
}
