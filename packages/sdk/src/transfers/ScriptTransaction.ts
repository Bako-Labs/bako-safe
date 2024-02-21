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
import { transactionScript } from './helpers';
import { IAssetGroupByTo } from '../assets';

const { GAS_LIMIT, GAS_PRICE } = process.env;

interface BSAFEScriptTransactionConstructor {
  gasPrice: BN;
  gasLimit: BN;
  script: BytesLike;
}

export class BSAFEScriptTransaction extends ScriptTransactionRequest {
  constructor(
    { script, gasLimit, gasPrice }: BSAFEScriptTransactionConstructor = {
      script: transactionScript,
      gasPrice: bn(GAS_PRICE),
      gasLimit: bn(GAS_LIMIT),
    },
  ) {
    super({
      gasPrice,
      gasLimit,
      script,
    });
  }

  public async instanceTransaction(
    _coins: Resource[],
    vault: Predicate<[]>,
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

    //todo: invalidate used coins [make using bsafe api assets?]
    this.addResources(_coins);

    this.inputs?.forEach((input) => {
      if (
        input.type === InputType.Coin &&
        hexlify(input.owner) === vault.address.toB256()
      ) {
        input.predicate = arrayify(vault.bytes);
        input.predicateData = arrayify(vault.predicateData);
      }
    });

    if (witnesses) {
      this.witnesses = [...this.witnesses, ...witnesses];
    }
  }
}
