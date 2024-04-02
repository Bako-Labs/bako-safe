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
import { BSafe } from '../../../configurables';
import { transactionScript } from './helpers';

interface BSAFEScriptTransactionConstructor {
  gasPrice: BN;
  gasLimit: BN;
  script: BytesLike;
}

export class BSAFEScriptTransaction extends ScriptTransactionRequest {
  constructor(
    { script, gasLimit, gasPrice }: BSAFEScriptTransactionConstructor = {
      script: transactionScript,
      gasPrice: bn(BSafe.getChainConfig('GAS_PRICE')),
      gasLimit: bn(BSafe.getChainConfig('GAS_LIMIT')),
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
        //input.predicateData = arrayify();
      }
    });

    if (witnesses) {
      this.witnesses = [...this.witnesses, ...witnesses];
    }
  }
}
