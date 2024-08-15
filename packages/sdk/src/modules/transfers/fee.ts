import { TransactionRequest, Provider, BN, transactionRequestify } from 'fuels';

export const estimateFee = async (
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
}> => {
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
};

export const FAKE_WITNESSES =
  '0x42414b4f00000000000000000d5dd5c22ba48bbcc3dec471b92f3dbe43535c479f85370c66aff08a88e33ecd017866b1f42d27c49289509d052bdbd1a1c918bc52e507b1c227c7824cecb1900000000000000024000000000000004d00000000000000407b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22222c226f726967696e223a22687474703a2f2f6d6f636b746573742e74657374222c2263726f73734f726967696e223a66616c73652c2272616e646f6d223a2252616e646f6d2064617461227d0452020bd3bd626f8f0a0ae3b4fd21653ab0998afdb00a1bdec2d20c7f95047e866545bfea39fcff8c52f105a8fdbd5c7c9ff08993dc6b72c8e2b4d2603ab170';
