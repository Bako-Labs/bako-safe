import {
  Address,
  InputType,
  Predicate,
  Resource,
  ScriptTransactionRequest,
  arrayify,
  hexlify,
  BN,
  BytesLike,
  bn,
} from 'fuels';
import { Vault } from '../vault/Vault';
import { IAssetGroupByTo } from '../../utils/assets';
import { estimateFee } from './fee';
import { BaseTransfer } from './BaseTransfer';

interface BakoSafeScriptTransactionConstructor {
  gasLimit?: BN;
  maxFee?: BN;
  script?: BytesLike;
}

export class BakoSafeScriptTransaction extends ScriptTransactionRequest {
  constructor(
    { script, gasLimit, maxFee }: BakoSafeScriptTransactionConstructor = {
      script: '0x',
      gasLimit: bn(0),
      maxFee: bn(0),
    },
  ) {
    super({
      script,
      gasLimit,
      maxFee,
    });
  }

  public async instanceTransaction(
    _coins: Resource[],
    vault: Vault,
    outputs: IAssetGroupByTo,
    witnesses?: string[],
  ) {
    Object.entries(outputs).map(([, value]) => {
      this.addCoinOutput(
        Address.fromString(value.to),
        value.amount,
        value.assetId,
      );
    });

    //todo: invalidate used coins [make using BakoSafe api assets?] UTXO PROBLEM
    this.addResources(_coins);

    this.inputs?.forEach((input) => {
      if (
        input.type === InputType.Coin &&
        hexlify(input.owner) === vault.address.toB256()
      ) {
        input.predicate = arrayify(vault.bytes);
      }
    });

    if (witnesses) {
      this.witnesses = [...this.witnesses, ...witnesses];
    }

    const baseTX = await BaseTransfer.prepareTransaction(vault, this);

    this.gasLimit = baseTX.gasLimit;
    this.maxFee = baseTX.maxFee;
  }
}
