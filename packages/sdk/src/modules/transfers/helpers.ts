import {
  bn,
  hashMessage,
  ScriptTransactionRequest,
  Signer,
  transactionRequestify,
  TransactionRequestLike,
  TransactionType,
} from 'fuels';
import { defaultValues } from '../vault/helpers';
import { ITransaction, TransactionService, TransactionStatus } from '../../api';
import {
  ECreationTransactiontype,
  ICreationTransaction,
  IFormatTransfer,
  TransferConstructor,
  TransferFactory,
  TransferInstanceError,
} from './types';
import { Vault } from '../vault/Vault';
import { Asset } from '../../utils/assets';
import { BakoSafeScriptTransaction } from './ScriptTransaction';
import { v4 as uuidv4 } from 'uuid';

export function recoverSigner(signer: string, tx_id: string) {
  if (tx_id == '0x') return;

  const a = Signer.recoverAddress(hashMessage(tx_id), signer);
  return a ? a.toString() : defaultValues['address'];
}
export const getHashTxId = (
  script: TransactionRequestLike,
  chainId: number,
) => {
  const txHash = transactionRequestify(script).getTransactionId(chainId);
  return txHash.slice(2);
};

export const formatTransaction = async ({
  vault,
  assets,
  witnesses,
}: IFormatTransfer & { vault: Vault }) => {
  try {
    const outputs = await Asset.assetsGroupByTo(assets);
    const coins = await Asset.assetsGroupById(assets);

    const transactionCoins = await Asset.addTransactionFee(
      coins,
      //bn(BakoSafe.getGasConfig('BASE_FEE')),
      bn(0),
      vault.provider,
    );

    const _coins = await vault.getResourcesToSpend(transactionCoins);

    const script_t = new BakoSafeScriptTransaction();
    const minSigners = vault.getConfigurable().SIGNATURES_COUNT ?? 10;

    await script_t.instanceTransaction(
      _coins,
      vault,
      outputs,
      minSigners,
      witnesses,
    );
    return script_t;
  } catch (e: any) {
    throw new Error(e);
  }
};

export const isNewTransaction = async ({
  transfer,
  auth,
  vault,
}: TransferFactory) => {
  const validation =
    transfer &&
    Object.entries(transfer).length <= 3 &&
    Object.entries(transfer).length > 0 &&
    typeof transfer != 'string' &&
    'assets' in transfer &&
    !!vault;
  const isNew = validation;

  if (isNew) {
    const { assets: _assets } = transfer;
    const service = auth && new TransactionService(auth);
    const assets = _assets.map((assest) => ({
      assetId: assest.assetId,
      amount: assest.amount.toString(),
      to: assest.to,
    }));

    const transactionName = `tx_${uuidv4()}`;
    const scriptTransaction = await formatTransaction({
      name: transfer.name ? transfer.name : transactionName,
      vault: vault,
      assets: assets,
    });

    const txData = transactionRequestify(scriptTransaction);
    const hashTxId = getHashTxId(txData, vault.provider.getChainId());

    const BakoSafeTransaction =
      auth &&
      service &&
      (await service.create({
        assets,
        hash: hashTxId,
        txData: txData,
        name: transfer.name ?? transactionName,
        status: TransactionStatus.AWAIT_REQUIREMENTS,
        predicateAddress: vault.address.toString(),
      }));

    const data = {
      vault,
      service,
      BakoSafeTransaction,
      name: transfer.name ?? transactionName,
      transactionRequest: txData,
      BakoSafeScript: scriptTransaction,
      witnesses: [],
      BakoSafeTransactionId: BakoSafeTransaction?.id,
    };

    return {
      is: isNew,
      data,
    };
  }

  return {
    is: isNew,
    data: undefined,
  };
};

export const isOldTransaction = async ({
  transfer,
  auth,
  vault,
}: TransferFactory) => {
  const isOld = typeof transfer === 'string';

  if (isOld) {
    if (!auth) {
      throw new Error(TransferInstanceError.REQUIRED_AUTH);
    }
    const service = new TransactionService(auth);
    //if transfer min length is 36, is an transaction id
    //else is an hash
    const transaction =
      transfer.length <= 36
        ? await service.findByTransactionID(transfer)
        : await service.findByHash(transfer);

    const scriptTransactionRequest = await formatTransaction({
      name: transaction.name!,
      vault: vault,
      assets: transaction.assets,
      witnesses: transaction.resume.witnesses
        .map((witness) => witness.signature)
        .filter((witness) => !!witness),
    });

    const data: TransferConstructor = {
      vault,
      service,
      name: transaction.name!,
      BakoSafeScript: scriptTransactionRequest,
      transactionRequest: transactionRequestify(scriptTransactionRequest),
      witnesses: transaction.resume.witnesses.map((witness) => witness.account),
      BakoSafeTransactionId: transaction.id,
      BakoSafeTransaction: transaction,
    };

    return {
      is: isOld,
      data,
    };
  }

  return {
    is: isOld,
    data: undefined,
  };
};

export const isNewTransactionByScript = async ({
  transfer,
  auth,
  vault,
  isSave,
}: TransferFactory) => {
  const isScript =
    transfer &&
    Object.entries(transfer).length > 3 &&
    typeof transfer != 'string' &&
    'type' in transfer &&
    transfer.type === TransactionType.Script;

  const transactionName = `tx_${uuidv4()}`;
  const service = auth && new TransactionService(auth);

  if (isScript) {
    vault.populateTransactionPredicateData(transfer);
    const txData = transactionRequestify(transfer);
    const hashTxId = getHashTxId(txData, vault.provider.getChainId());
    const assets = txData.getCoinOutputs().map((coin) => ({
      assetId: coin.assetId.toString(),
      to: coin.to.toString(),
      amount: bn(coin.amount).format().toString(),
    }));

    let transaction: ITransaction | undefined = undefined;
    if (auth && service && isSave) {
      transaction = await service.create({
        assets,
        hash: hashTxId,
        txData: txData,
        name: transactionName,
        status: TransactionStatus.AWAIT_REQUIREMENTS,
        predicateAddress: vault.address.toString(),
      });
    }

    const witnesses =
      transaction && transaction.resume.witnesses
        ? transaction.resume.witnesses
            .map((witness) => witness.signature)
            .filter((signature) => !!signature)
        : [];

    const data = {
      vault,
      service,
      witnesses: witnesses,
      name: transactionName,
      transactionRequest: txData,
      BakoSafeScript: new ScriptTransactionRequest(),
      BakoSafeTransaction: transaction,
      BakoSafeTransactionId: transaction?.id,
    };

    return {
      is: isScript,
      data,
    };
  }

  return {
    is: isScript,
    data: undefined,
  };
};

export const identifyCreateTransactionParams = async (
  param: TransferFactory,
): Promise<ICreationTransaction> => {
  try {
    const { data: oldData, is: isOld } = await isOldTransaction(param);
    const { data: newData, is: isNew } = await isNewTransaction(param);
    const { data: sData, is: isScript } = await isNewTransactionByScript(param);

    if (isOld && !!oldData) {
      return {
        type: ECreationTransactiontype.IS_OLD,
        payload: oldData!,
      };
    } else if (isNew && !!newData) {
      return {
        type: ECreationTransactiontype.IS_NEW,
        payload: newData!,
      };
    }
    return {
      type: ECreationTransactiontype.IS_SCRIPT,
      payload: sData!,
    };
  } catch (e: any) {
    throw new Error(e.message);
  }
};
