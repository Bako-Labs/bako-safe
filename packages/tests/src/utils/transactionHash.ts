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

import type { TransactionRequest } from 'fuels';

export function hashTransaction(
  transactionRequest: TransactionRequest,
  chainId: number,
  assetId: string,
) {
  const transaction = transactionRequest.toTransaction();
  const txBytes2 = new TransactionCoder().encode(transaction);
  const inputs_copy = transaction.inputs;
  let utxo;

  // filter by assetIdParam to use the correct utxo
  inputs_copy.map((input) => {
    if (input.type === InputType.Coin) {
      utxo = sha256(concat([input.txID, uint64ToBytesBE(input.outputIndex)]));
    }
  });

  if (transaction.type === TransactionType.Script) {
    transaction.receiptsRoot = ZeroBytes32;
  }
  transaction.inputs = [];

  // .map((input) => {
  //   const inputClone = clone(input);
  //   if (inputClone.type === InputType.Coin) {
  //     inputClone.txPointer = {
  //       blockHeight: 0,
  //       txIndex: 0,
  //     };
  //     inputClone.predicateGasUsed = bn(0);
  //     inputClone.predicate = '0x';
  //     inputClone.predicateData = '0x';
  //     return inputClone;
  //   }
  //   return null;
  // })
  // .filter((i) => !!i);
  transaction.inputsCount = transaction.inputs.length;

  transaction.outputsCount = transaction.outputs.length;
  transaction.witnesses = [];
  transaction.witnessesCount = 0;
  const txBytes = new TransactionCoder().encode(transaction);
  const concatenatedData = concat([txBytes, utxo!]);

  return {
    hex: hexlify(concatenatedData),
    hash: sha256(concatenatedData),
    input: inputs_copy,
    utxo,
  };
}
