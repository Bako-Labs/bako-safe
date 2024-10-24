import fs from 'fs';
import path from 'path';
import { BakoPredicateLoader } from '../out';
import { getPredicateRoot, hexlify } from 'fuels';
import { getFuelToolchain } from './getFuelToolchain';

// data conf
export const PREDICATE_VERSION_PATH =
  '../../sdk/src/sway/predicates/versions.json';
const PREDICATE_TOOLCHAIN_PATH = '../out/predicates/index.ts';

async function makeVersion() {
  const rootPredicate = getPredicateRoot(BakoPredicateLoader.bytecode);

  if (!rootPredicate) {
    throw new Error('Could not find root predicate');
  }

  // paths
  const toolchainPath = path.join(__dirname, PREDICATE_TOOLCHAIN_PATH);
  const jsonVersionPath = path.join(__dirname, PREDICATE_VERSION_PATH);
  const content = fs.readFileSync(jsonVersionPath, 'utf-8');
  const jsonData = JSON.parse(content);

  const toolchain = await getFuelToolchain(toolchainPath);

  // check if version already exists and toolchain is the same
  if (jsonData[rootPredicate]) {
    return;
  }

  // add new version
  jsonData[rootPredicate] = {
    time: new Date().getTime(),
    bytecode: hexlify(BakoPredicateLoader.bytecode),
    abi: BakoPredicateLoader.abi,
    toolchain,
    description: '',
    deployed: [],
  };

  // write in file
  fs.writeFileSync(jsonVersionPath, JSON.stringify(jsonData, null, 2));
  console.log('✅ [BUILD] Root predicate:', rootPredicate);
}

makeVersion();
