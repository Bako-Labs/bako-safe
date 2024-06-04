import {
  Provider,
  TransactionRequest,
  hexlify,
  TransactionResponse,
} from 'fuels';

export async function sendTransaction(
  provider: Provider,
  tx: TransactionRequest,
  signatures: Array<string>,
) {
  try {
    tx.witnesses = signatures;
    await provider.estimatePredicates(tx);
    const encodedTransaction = hexlify(tx.toTransactionBytes());
    const {
      submit: { id: transactionId },
    } = await provider.operations.submit({ encodedTransaction });

    const response = new TransactionResponse(transactionId, provider);
    return response;
  } catch (e) {
    console.log(e);
    throw new Error(e);
  }
}
