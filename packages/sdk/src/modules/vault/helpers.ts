import { Address, B256Address, Provider, ZeroBytes32 } from 'fuels';
import {
  ECreationtype,
  IBakoSafeApi,
  IConfVault,
  ICreation,
  ICreationPayload,
  IPayloadVault,
} from './types';
import { PredicateService } from '../../api/predicates';
import { BakoSafe } from '../../../configurables';

export const defaultValues: { [name: string]: string } = {
  signature:
    '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  address: '0x0000000000000000000000000000000000000000000000000000000000000000',
};

export const makeHashPredicate = () => Address.fromRandom().toB256();

export const makeSubscribers = (subscribers: string[]) => {
  const array: B256Address[] = Array(10).fill(ZeroBytes32);
  subscribers.forEach((value, index) => {
    array[index] = Address.fromString(value).toB256();
  });
  return array;
};

export const instanceByOldUtil = async (
  params: IBakoSafeApi,
): Promise<ICreationPayload> => {
  const { id, predicateAddress, token, address } = params;
  const hasId = 'id' in params && id;

  if (predicateAddress == undefined && id == undefined) {
    throw new Error('predicateAddress or BakoSafePredicateId is required');
  }

  const api = new PredicateService({
    address,
    token,
  });

  const result = hasId
    ? await api.findById(id)
    : await api.findByAddress(predicateAddress!);

  if (!result) {
    throw new Error('BakoSafeVault not found');
  }

  return {
    configurable: JSON.parse(result.configurable),
    provider: await Provider.create(result.provider),
    name: result.name,
    description: result.description,
    abi: result.version.abi,
    bytecode: result.version.bytes,
    BakoSafeAuth: {
      address,
      token,
    },
    BakoSafeVaultId: result.id,
    BakoSafeVault: result,
    api,
  };
};

export const instanceByNewUtil = async (
  params: IPayloadVault,
): Promise<ICreationPayload> => {
  const hasAuth = 'BakoSafeAuth' in params && params.BakoSafeAuth;
  let api;
  if (hasAuth) {
    const { address, token } = params.BakoSafeAuth!;
    api = new PredicateService({
      address,
      token,
    });
  }
  const provider = await Provider.create(
    params.configurable.network ?? BakoSafe.getProviders('CHAIN_URL'),
  );
  return {
    ...params,
    api,
    configurable: {
      ...params.configurable,
      chainId: await provider.getChainId(),
    },
    provider,
  };
};

export const isOldPredicate = async (
  param: IBakoSafeApi | IPayloadVault,
): Promise<{ is: boolean; data: ICreationPayload | undefined }> => {
  const is =
    ('predicateAddress' in param || 'id' in param) &&
    'address' in param &&
    'token' in param;

  return {
    is,
    data: is ? await instanceByOldUtil(param) : undefined,
  };
};

export const isNewPredicate = async (
  param: IBakoSafeApi | IPayloadVault,
): Promise<{
  is: boolean;
  data: ICreationPayload | undefined;
}> => {
  const is = 'configurable' in param;
  is && validations(param.configurable);
  return {
    is,
    data: is ? await instanceByNewUtil(param) : undefined,
  };
};

export const validations = (configurable: Omit<IConfVault, 'chainId'>) => {
  const { SIGNATURES_COUNT, SIGNERS } = configurable;
  if (!SIGNATURES_COUNT || Number(SIGNATURES_COUNT) == 0) {
    throw new Error('SIGNATURES_COUNT is required must be granter than zero');
  }
  if (!SIGNERS || SIGNERS.length === 0) {
    throw new Error('SIGNERS must be greater than zero');
  }
  if (SIGNERS.length < Number(SIGNATURES_COUNT)) {
    throw new Error('Required Signers must be less than signers');
  }
};

export const identifyCreateVaultParams = async (
  param: IPayloadVault | IBakoSafeApi,
): Promise<ICreation> => {
  try {
    const { data: oldData, is: isOld } = await isOldPredicate(param);
    const { data: newData } = await isNewPredicate(param);

    if (isOld && !!oldData) {
      return {
        type: ECreationtype.IS_OLD,
        payload: oldData!,
      };
    }
    return {
      type: ECreationtype.IS_NEW,
      payload: newData!,
    };
  } catch (e: any) {
    throw new Error(e.message);
  }
};
