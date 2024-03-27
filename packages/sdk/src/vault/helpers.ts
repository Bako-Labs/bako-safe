import { Address, B256Address, Provider, ZeroBytes32 } from 'fuels';
import {
  ECreationtype,
  IBSAFEApi,
  IConfVault,
  ICreation,
  IPayloadVault,
} from './types';
import { PredicateService } from '../api/predicates/predicate';

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
  params: IBSAFEApi,
): Promise<IPayloadVault> => {
  const { id, predicateAddress, token, address } = params;
  const hasId = 'id' in params && id;

  if (predicateAddress == undefined && id == undefined) {
    throw new Error('predicateAddress or BSAFEPredicateId is required');
  }

  const api = new PredicateService({
    address,
    token,
  });

  const result = hasId
    ? await api.findById(id)
    : await api.findByAddress(predicateAddress!);

  if (!result) {
    throw new Error('BSAFEVault not found');
  }

  return {
    configurable: JSON.parse(result.configurable),
    provider: await Provider.create(result.provider),
    name: result.name,
    description: result.description,
    abi: result.abi,
    bytecode: result.bytes,
    BSAFEAuth: {
      address,
      token,
    },
    BSAFEVaultId: result.id,
    BSAFEVault: result,
    api,
  };
};

export const instanceByNewUtil = (params: IPayloadVault): IPayloadVault => {
  const hasAuth = 'BSAFEAuth' in params && params.BSAFEAuth;
  if (hasAuth) {
    const { address, token } = params.BSAFEAuth!;
    params['api'] = new PredicateService({
      address,
      token,
    });
  }
  return params;
};

export const isOldPredicate = async (
  param: IBSAFEApi | IPayloadVault,
): Promise<{ is: boolean; data: IPayloadVault | undefined }> => {
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
  param: IBSAFEApi | IPayloadVault,
): Promise<{
  is: boolean;
  data: IPayloadVault | undefined;
}> => {
  const is = 'configurable' in param && 'provider' in param;
  is && validations(param.configurable);
  return {
    is,
    data: is ? instanceByNewUtil(param) : undefined,
  };
};

export const validations = (configurable: IConfVault) => {
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
  param: IPayloadVault | IBSAFEApi,
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
