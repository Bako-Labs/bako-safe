import { versions } from './';

export const DEFAULT_PREDICATE_VERSION = `0x7b0abb12fd26ff8716c487cd7051ea74bf995b31f4009a7d16005b9d14b63a85`;

export function getLatestPredicateVersion(provider: string) {
  // get latest version by time
  const keys = Object.keys(versions);
  let maxTime = -Infinity;
  keys.forEach((key) => {
    const currentTime = versions[key].time;
    const idDeployedPredicate = versions[key].deployed.includes(provider);
    const isMoreRecent = currentTime > maxTime;

    if (idDeployedPredicate && isMoreRecent) {
      maxTime = currentTime;
    }
  });

  // get latest version object
  const key =
    keys.find((key) => versions[key].time === maxTime) ??
    DEFAULT_PREDICATE_VERSION;

  return {
    bytecode: versions[key].bytecode,
    abi: versions[key].abi,
    version: key,
  };
}

export function loadPredicate(provider: string, version?: string) {
  if (!version) {
    return getLatestPredicateVersion(provider);
  }

  if (!versions[version]) {
    throw new Error(`Version ${version} not found`);
  }

  return {
    bytecode: versions[version].bytecode,
    abi: versions[version].abi,
    version,
  };
}
