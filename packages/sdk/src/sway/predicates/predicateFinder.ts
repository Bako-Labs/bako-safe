import { versions } from './';

export const DEFAULT_PREDICATE_VERSION = `0x6ca3bcd759b944b128e9007e2fa75bf700f28c39ce7b34fc241e2c57bf02bdff`;

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
