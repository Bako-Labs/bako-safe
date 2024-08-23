import {
  type BN,
  type Provider,
  type TransactionRequest,
  transactionRequestify,
} from 'fuels';

export const estimateFee = async (
  transaction: TransactionRequest,
  provider: Provider,
): Promise<{
  minGas: BN;
  minFee: BN;
  maxGas: BN;
  maxFee: BN;
  gasPrice: BN;
  gasLimit: BN;
  bako_max_fee: BN;
  bako_gas_limit: BN;
}> => {
  try {
    const _tx = transactionRequestify(transaction);

    _tx.witnesses = Array.from({ length: maxSigners }, () => FAKE_WITNESSES);

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
};

export const maxSigners = 10;

export const FAKE_WITNESSES =
  '0x000000000000000082a412d0b88a9d8348006e6347359604afaa9b81ac4e2f995c4142a90d9fd8beb332e91ab4573478f44ca318f32e65224a94615eeb987d99eed26692272d87120000000000000024000000000000005700000000000000257b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22222c226f726967696e223a2268747470733a2f2f62736166652d75692d6769742d73746167696e672d696e66696e6974792d626173652e76657263656c2e617070222c2263726f73734f726967696e223a66616c73657d766159c52a420165c2367df88c6aec599f50425345b97f1d4d1014572b9cbca51d00000000';
