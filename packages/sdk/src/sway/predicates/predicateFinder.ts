import { Wallet } from 'src/utils/vault/configurable';
import { versions } from './';

export const DEFAULT_PREDICATE_VERSION = `0x967aaa71b3db34acd8104ed1d7ff3900e67cff3d153a0ffa86d85957f579aa6a`;

export function getLatestPredicateVersion(wallet: Wallet) {
  // get latest version by time
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
