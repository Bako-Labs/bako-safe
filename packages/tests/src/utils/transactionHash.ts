import {
  concat,
  TransactionType,
  InputType,
  OutputType,
  TransactionCoder,
  bn,
  uint64ToBytesBE,
  sha256,
  ZeroBytes32,
  hexlify,
  arrayify,
  Address,
} from 'fuels';
import { clone } from 'ramda';

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
  inputs_copy.map((input) => {
    if (input.type === InputType.Coin) {
      console.log('input: ', input.txID, input.outputIndex);
      utxo = sha256(concat([input.txID, uint64ToBytesBE(input.outputIndex)]));
    }
  });

  // console.log('before cleanup', txBytes2.length);
  // console.log('before cleanup', hexlify(txBytes2));

  if (transaction.type === TransactionType.Script) {
    transaction.receiptsRoot = ZeroBytes32;
  }
  // console.log('[transaction_inputs]: ', transaction.inputs);
  // Zero out input fields
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

  console.log('[inputs]: ', transaction.inputs);

  // Zero out output fields
  // transaction.outputs = transaction.outputs.map((output) => {
  //   const outputClone = clone(output);
  //   switch (outputClone.type) {
  //     // Zero out on signing: balanceRoot, stateRoot
  //     case OutputType.Contract: {
  //       outputClone.balanceRoot = ZeroBytes32;
  //       outputClone.stateRoot = ZeroBytes32;
  //       return outputClone;
  //     }
  //     // Zero out on signing: amount
  //     case OutputType.Change: {
  //       return outputClone;
  //     }
  //     // Zero out on signing: amount, to and assetId
  //     case OutputType.Variable: {
  //       outputClone.to = ZeroBytes32;
  //       outputClone.amount = bn(0);
  //       outputClone.assetId = ZeroBytes32;
  //       return outputClone;
  //     }
  //     // case OutputType.Coin: {
  //     //   // outputClone.amount = bn(0);
  //     //   outputClone.
  //     //   return outputClone;
  //     // }
  //     default:
  //       return outputClone;
  //   }
  // });

  // 000000000000000
  // 0000000000000000

  //000000000000000
  //0000000000000000

  console.log('[outputs]: ', transaction.outputs);
  transaction.outputsCount = transaction.outputs.length;
  transaction.witnesses = [];
  transaction.witnessesCount = 0;
  console.log(transaction.witnessesCount);
  // console.log("[ENCODE_OUTPUT]: ");
  const chainIdBytes = uint64ToBytesBE(chainId);
  const txBytes = new TransactionCoder().encode(transaction);
  // todo: concat utxo_id here
  const concatenatedData = concat([
    chainIdBytes,
    txBytes,
    Address.fromRandom().toHexString(),
  ]);
  return {
    hex: hexlify(concat([txBytes, utxo!])),
    hash: sha256(concatenatedData),
    input: inputs_copy,
    utxo,
  };
}
