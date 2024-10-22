import { decompressBytecode } from 'fuels';
import { versions } from './';

export function getLatestPredicateVersion() {
  // load versions

  // get latest version by time
  const keys = Object.keys(versions);
  let maxTime = -Infinity;
  keys.forEach((key) => {
    const currentTime = versions[key].time;
    if (currentTime > maxTime) {
      maxTime = currentTime;
    }
  });

  // get latest version object
  const key = keys.find((key) => versions[key].time === maxTime) ?? keys[0];

  return {
    bytecode: versions[key].bytecode,
    abi: versions[key].abi,
  };
}

export function loadPredicate(version?: string) {
  if (!version) {
    return getLatestPredicateVersion();
  }

  if (!versions[version]) {
    throw new Error(`Version ${version} not found`);
  }

  return {
    bytecode: versions[version].bytecode,
    abi: versions[version].abi,
  };
}
