import fs from 'fs';
import path from 'path';
import { getPredicateRoot } from 'fuels';
import { BakoPredicateLoader } from '../out';
import { PREDICATE_VERSION_PATH } from './makeVersion';

import dotenv from 'dotenv';

dotenv.config();

const { PROVIDER_URL: providerUrl } = process.env;

async function setNetworkDeployed() {
  console.log('Setting network deployed...');
  const network = providerUrl;
  const jsonVersionPath = path.join(__dirname, PREDICATE_VERSION_PATH);
  const content = fs.readFileSync(jsonVersionPath, 'utf-8');
  const jsonData = JSON.parse(content);

  const rootPredicate = getPredicateRoot(BakoPredicateLoader.bytecode);

  if (!rootPredicate) {
    throw new Error('Could not find root predicate');
  }

  if (!jsonData[rootPredicate]) {
    throw new Error('Version not found');
  }

  if (!jsonData[rootPredicate].deployed.includes(network)) {
    jsonData[rootPredicate].deployed.push(network);
  }

  fs.writeFileSync(jsonVersionPath, JSON.stringify(jsonData, null, 2));

  console.log('✅ Network deployed set', network, rootPredicate);
}

setNetworkDeployed();
