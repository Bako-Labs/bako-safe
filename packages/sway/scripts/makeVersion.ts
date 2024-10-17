import fs from 'fs';
import path from 'path';
import { BakoPredicateLoader } from '../out';
import { compressBytecode, getPredicateRoot, hexlify } from 'fuels';

// data conf
const PREDICATE_VERSION_PATH = '../../sdk/src/sway/predicates/versions.json';

async function moveFiles() {
  const rootPredicate = getPredicateRoot(BakoPredicateLoader.bytecode);

  // paths
  const jsonVersionPath = path.join(__dirname, PREDICATE_VERSION_PATH);
  const content = fs.readFileSync(jsonVersionPath, 'utf-8');
  const jsonData = JSON.parse(content);

  // add new version
  jsonData[rootPredicate] = {
    time: new Date().getTime(),
    bytecode: hexlify(BakoPredicateLoader.bytecode),
    abi: BakoPredicateLoader.abi,
  };

  // write in file
  fs.writeFileSync(jsonVersionPath, JSON.stringify(jsonData, null, 2));
}

moveFiles();
