import { BN, Provider, TransactionRequest, transactionRequestify } from 'fuels';

import { ECreationTransactiontype, TransferFactory } from './types';

import { FAKE_WITNESSES, identifyCreateTransactionParams } from './helpers';
import { BaseTransfer } from './BaseTransfer';

/**
 * `Transfer` are extension of ScriptTransactionRequest, to create and send transactions
 */
export class Transfer extends BaseTransfer<TransactionRequest> {
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

  public static async estimateFee(
    transaction: TransactionRequest,
    provider: Provider,
    required_witnesses: number,
  ): Promise<{
    minGas: BN;
    minFee: BN;
    maxGas: BN;
    maxFee: BN;
    gasPrice: BN;
    gasLimit: BN;
    bako_max_fee: BN;
    bako_gas_limit: BN;
  }> {
    try {
      const _tx = transactionRequestify(transaction);

      _tx.witnesses = Array.from(
        { length: required_witnesses },
        () => FAKE_WITNESSES,
      );

      const fee = await provider.estimateTxGasAndFee({
        transactionRequest: transactionRequestify(_tx),
      });

      return {
        ...fee,
        bako_max_fee: fee.maxFee.add(fee.minFee),
        bako_gas_limit: fee.gasLimit,
      };
    } catch (e) {
      return Promise.reject(e);
    }
  }
}
