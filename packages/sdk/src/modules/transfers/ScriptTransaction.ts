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
import { IAssetGroupByTo } from '../../utils/assets';
import { Transfer } from './Transfer';

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
    vault: Predicate<[]>,
    outputs: IAssetGroupByTo,
    minSigners: number = 1,
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

    const fee = await Transfer.estimateFee(this, vault.provider, minSigners);

    this.maxFee = fee.bako_max_fee;
    this.gasLimit = fee.bako_gas_limit;
  }
}
