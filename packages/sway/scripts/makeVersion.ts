import fs, { readFileSync } from 'fs';
import path from 'path';
import { BakoPredicateLoader } from '../out';
import { FuelToolChain } from '../../sdk/src/sway/predicates/types';
import { getPredicateRoot, hexlify } from 'fuels';

// data conf
const PREDICATE_VERSION_PATH = '../../sdk/src/sway/predicates/versions.json';
const PREDICATE_TOOLCHAIN_PATH = '../out/predicates/index.ts';

async function extractCommentFromFile(
  filePath: string,
): Promise<FuelToolChain> {
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  const versionInfoRegex =
    /Fuels version:\s*([\d.]+)[\s\S]*?Forc version:\s*([\d.]+)[\s\S]*?Fuel-Core version:\s*([\d.]+)/;

  const match = fileContent.match(versionInfoRegex);

  if (match) {
    return {
      fuelsVersion: match[1],
      forcVersion: match[2],
      fuelCoreVersion: match[3],
    };
  }

  throw new Error('Could not find version information');
}

async function moveFiles() {
  const rootPredicate = getPredicateRoot(BakoPredicateLoader.bytecode);

  if (!rootPredicate) {
    throw new Error('Could not find root predicate');
  }

  // paths
  const toolchainPath = path.join(__dirname, PREDICATE_TOOLCHAIN_PATH);
  const jsonVersionPath = path.join(__dirname, PREDICATE_VERSION_PATH);
  const content = fs.readFileSync(jsonVersionPath, 'utf-8');
  const jsonData = JSON.parse(content);

  const toolchain = await extractCommentFromFile(toolchainPath);

  // check if version already exists and toolchain is the same
  if (
    jsonData[rootPredicate] &&
    jsonData[rootPredicate].toolchain.fuelsVersion === toolchain.fuelsVersion
  ) {
    return;
  }

  // add new version
  jsonData[rootPredicate] = {
    time: new Date().getTime(),
    bytecode: hexlify(BakoPredicateLoader.bytecode),
    abi: BakoPredicateLoader.abi,
    toolchain,
  };

  // write in file
  fs.writeFileSync(jsonVersionPath, JSON.stringify(jsonData, null, 2));
}

moveFiles();
