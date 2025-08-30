import { Wallet, walletOrigin } from '../../modules/vault/utils/configurable';
import { Version, versions } from './';
import { Vault } from '../../modules';
import { Address, Provider } from 'fuels';

export const DEFAULT_PREDICATE_VERSION = `0x967aaa71b3db34acd8104ed1d7ff3900e67cff3d153a0ffa86d85957f579aa6a`;
export const DEFAULT_PROVIDER_URL = `https://mainnet.fuel.network/v1/graphql`;

export function getLatestPredicateVersion(wallet: Wallet) {
  const keys = Object.keys(versions);
  let maxTime = -Infinity;
  let latestKey: string | undefined;

  keys.forEach((key) => {
    const currentTime = versions[key].time;
    const isMoreRecent = currentTime > maxTime;

    const isValidVersion =
      isMoreRecent && versions[key].walletOrigin === wallet;

    if (isValidVersion) {
      maxTime = currentTime;
      latestKey = key;
    }
  });

  if (!latestKey) {
    throw new Error(
      `No compatible predicate version with this configurable found for wallet type ${wallet}`,
    );
  }

  return {
    bytecode: versions[latestKey].bytecode,
    abi: versions[latestKey].abi,
    version: latestKey,
  };
}

export function loadPredicate(wallet: Wallet, version?: string) {
  if (!version) {
    return getLatestPredicateVersion(wallet);
  }

  if (!versions[version]) {
    const message = !!wallet
      ? `Predicate version ${version} not found. Available to your address ${wallet} type`
      : `Version ${version} not found`;

    throw new Error(message);
  }

  if (wallet && versions[version].walletOrigin !== wallet) {
    throw new Error(
      `Predicate version ${version} is not compatible with your address type ${wallet}`,
    );
  }

  return {
    bytecode: versions[version].bytecode,
    abi: versions[version].abi,
    version,
  };
}

export function getCompatiblePredicateVersions(wallet: Wallet): string[] {
  return Object.keys(versions).filter(
    (key) => versions[key].walletOrigin === wallet,
  );
}

export function getAllPredicateVersions(): string[] {
  return Object.keys(versions);
}

export function getAllVersionsDetails() {
  const result: Record<
    keyof typeof versions,
    Omit<Version, 'abi' | 'bytecode'>
  > = {} as any;

  (Object.keys(versions) as Array<keyof typeof versions>).forEach((key) => {
    const { bytecode, abi, ...rest } = versions[key];
    result[key] = rest;
  });

  return result;
}

export type UsedPredicateVersions = {
  version: string;
  hasBalance: boolean;
  predicateAddress: string;
  origin: string;
};

type Settled<T> = PromiseSettledResult<T>;
const isFulfilled = <T>(r: Settled<T>): r is PromiseFulfilledResult<T> =>
  r.status === 'fulfilled';

export async function legacyConnectorVersion(
  wallet: string,
  providerUrl: string = DEFAULT_PROVIDER_URL,
): Promise<UsedPredicateVersions[]> {
  const type = walletOrigin(wallet);
  // todo: return and increase this logic -> return if is not a connector supported version
  const isInvalid = type != Wallet.EVM && type != Wallet.SVM;
  if (isInvalid) {
    return [];
  }

  const candidates = getCompatiblePredicateVersions(type);

  if (candidates.length === 0) {
    throw new Error(
      `No compatible predicate version with this configurable found for wallet type ${type}`,
    );
  }

  const provider = new Provider(providerUrl);
  const signer = new Address(wallet).toB256();

  const settled = await Promise.allSettled(
    candidates.map(async (version) => {
      const vault = new Vault(provider, { SIGNER: signer }, version);
      const { balances } = await vault.getBalances();

      const hasBalance =
        Array.isArray(balances) &&
        balances.some((b) => {
          const raw =
            typeof b.amount?.format === 'function'
              ? b.amount.format()
              : String(b.amount ?? '0');
          try {
            return BigInt(raw) > 0n;
          } catch {
            return Number(raw) > 0;
          }
        });

      const result: UsedPredicateVersions = {
        version,
        hasBalance,
        predicateAddress: vault.address.toB256(),
        origin: versions[version].walletOrigin,
      };

      return result;
    }),
  );

  return settled
    .filter(isFulfilled)
    .map((r) => r.value)
    .sort((a, b) => Number(b.hasBalance) - Number(a.hasBalance));
}
