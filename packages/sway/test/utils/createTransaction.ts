import {
  Predicate,
  InputValue,
  ScriptTransactionRequest,
  bn,
  InputType,
  hexlify,
  arrayify,
} from 'fuels';
import { GAS_LIMIT, MAX_FEE } from './constants';

export async function createTransaction(predicate: Predicate<InputValue[]>) {
  try {
    const tx = new ScriptTransactionRequest();
    const provider = predicate.provider;

    tx.gasLimit = bn(GAS_LIMIT);
    tx.maxFee = bn(MAX_FEE);

    const coins = await predicate.getResourcesToSpend([
      {
        amount: bn(100),
        assetId: provider.getBaseAssetId(),
      },
    ]);
    tx.addResources(coins);

    tx.inputs?.forEach((input) => {
      if (
        input.type === InputType.Coin &&
        hexlify(input.owner) === predicate.address.toB256()
      ) {
        input.predicate = arrayify(predicate.bytes);
      }
    });

    return tx;
  } catch (e) {
    console.log(e);
    throw new Error(e);
  }
}
