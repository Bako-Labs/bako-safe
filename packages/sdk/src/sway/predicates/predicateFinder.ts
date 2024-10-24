import { versions } from './';

export const DEFAULT_PREDICATE_VERSION = `0x0ec304f98efc18964de98c63be50d2360572a155b16bcb0f3718c685c70a00aa`;

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

  if (!versions[version].deployed.includes(provider)) {
    throw new Error(`Version ${version} not deployed on ${provider}`);
  }

  return {
    bytecode: versions[version].bytecode,
    abi: versions[version].abi,
    version,
  };
}
