import { Address, B256Address, Provider, ZeroBytes32, isB256 } from 'fuels';
import {
  EConfigTypes,
  ECreationtype,
  IBakoSafeApi,
  IConfVault,
  ICreation,
  ICreationPayload,
  IPayloadVault,
  JsonAbiConfigurable,
  JsonAbiType,
} from './types';
import { PredicateService } from '../../api/predicates';
import { BakoSafe } from '../../../configurables';
import { Vault } from './Vault';

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
    version: result.version.code,
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
  const hasVersion = !!params.version;
  const { code, abi, bytes } = hasVersion
    ? await Vault.BakoSafeGetPredicateVersionByCode(params.version!)
        .then((data) => data)
        .catch(() => {
          throw new Error('Invalid predicate version');
        })
    : await Vault.BakoSafeGetCurrentPredicateVersion();
  return {
    ...params,
    api,
    configurable: {
      ...params.configurable,
      chainId: await provider.getChainId(),
    },
    provider,
    abi,
    bytecode: bytes,
    version: code,
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
  return {
    is,
    data: is ? await instanceByNewUtil(param) : undefined,
  };
};

export const validateConfigTypeArray = (
  value: unknown,
  key: string,
  versionTypes: JsonAbiType[],
) => {
  if (!Array.isArray(value)) {
    throw new Error(`${key} must be an array`);
  }

  // const itemTypeId = versionTypes.find(
  //   (item) => formatTypeDeclaration(item.type) === EConfigTypes.array,
  // )?.components![0].type;
  // const itemType = versionTypes.find(
  //   (item) => item.typeId === itemTypeId,
  // )!.type;

  // value.forEach((item) => {
  //   try {
  //     validateConfigTypes(item, key, itemType, versionTypes);
  //   } catch (e) {
  //     throw new Error(`${key} must be an array of ${itemType}`);
  //   }
  // });
};

export const validateConfigTypeB256 = (value: unknown, key: string) => {
  if (typeof value !== 'string' || !isB256(value)) {
    throw new Error(`${key} must be a b256`);
  }
};

export const validateConfigTypeBoolean = (value: unknown, key: string) => {
  if (typeof value !== 'boolean') {
    throw new Error(`${key} must be a boolean`);
  }
};

export const validateConfigTypeU64 = (value: unknown, key: string) => {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`${key} must be an integer`);
  }
};

export const validateConfigTypes = (
  value: unknown,
  key: string,
  type: string,
  versionTypes: JsonAbiType[],
) => {
  switch (type) {
    case EConfigTypes.array:
      return validateConfigTypeArray(value, key, versionTypes);
    case EConfigTypes.b256:
      return validateConfigTypeB256(value, key);
    case EConfigTypes.boolean:
      return validateConfigTypeBoolean(value, key);
    case EConfigTypes.u64:
      return validateConfigTypeU64(value, key);
    default:
      return;
  }
};

export const formatTypeDeclaration = (type: string) => {
  const hasSquareBracketsPair = /\[.*?\]/.test(type);

  if (hasSquareBracketsPair) {
    const formattedType = type.replace(/\[.*?\]/g, '[]');
    return formattedType;
  }

  return type;
};

export const validateConfigurable = (
  configurable: Omit<IConfVault, 'chainId'>,
  abi: string,
) => {
  const optionalConfigs = ['HASH_PREDICATE'];

  const versionAbi = JSON.parse(abi);
  const versionTypes: JsonAbiType[] = versionAbi.types;
  const versionConfigs: JsonAbiConfigurable[] = versionAbi.configurables;
  const versionConfigKeys = versionConfigs
    .filter((config) => !optionalConfigs.includes(config.name))
    .map((config: JsonAbiConfigurable) => config.name);

  //Validates params
  versionConfigKeys.forEach((key) => {
    if (!(key in configurable)) {
      throw new Error(`${key} is required`);
    }
  });

  //Validates params values
  versionConfigs.forEach((config: JsonAbiConfigurable) => {
    const key = config.name;
    const typeId = config.configurableType.type;
    const type = versionTypes.find((type) => type.typeId === typeId)!.type;
    const formattedType = formatTypeDeclaration(type);
    const value = configurable[key];

    if (!optionalConfigs.includes(key) || value) {
      validateConfigTypes(value, key, formattedType, versionTypes);
    }
  });
};

export const validations = (
  configurable: Omit<IConfVault, 'chainId'>,
  abi: string,
) => {
  validateConfigurable(configurable, abi);

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

    const abi = isOld ? oldData?.abi : newData?.abi;
    const configurable = isOld ? oldData?.configurable : newData?.configurable;
    validations(configurable!, abi!);

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
