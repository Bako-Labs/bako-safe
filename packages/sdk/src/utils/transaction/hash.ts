import {
  concat,
  TransactionType,
  InputType,
  TransactionCoder,
  uint64ToBytesBE,
  sha256,
  ZeroBytes32,
  hexlify,
} from 'fuels';

import type { InputCoin, TransactionRequest } from 'fuels';

export function hashTransaction(
  transactionRequest: TransactionRequest,
  assetId: string = ZeroBytes32,
) {
  const transaction = transactionRequest.toTransaction();
  const inputs_copy = transaction.inputs;
  let utxo;
  let utxoIndex = 0;

  inputs_copy
    .filter((input): input is InputCoin => input.type === InputType.Coin)
    .filter((input) => input.assetId === assetId)
    .map((input, index) => {
      utxo = sha256(concat([input.txID, uint64ToBytesBE(input.outputIndex)]));
      utxoIndex = index;
    });

  if (transaction.type === TransactionType.Script) {
    transaction.receiptsRoot = ZeroBytes32;
  }
  transaction.inputs = [];
  transaction.inputsCount = transaction.inputs.length;
  transaction.outputsCount = transaction.outputs.length;
  transaction.witnesses = [];
  transaction.witnessesCount = 0;

  const txBytes = new TransactionCoder().encode(transaction);
  const concatenatedData = concat([txBytes, utxo!]);

  return {
    hex: hexlify(concatenatedData),
    hash: sha256(concatenatedData),
    utxo,
    utxoIndex,
  };
}
