import { createConfig } from 'fuels';

import dotenv from 'dotenv';

dotenv.config();

const { PROVIDER_URL: providerUrl, PRIVATE_KEY: privateKey } = process.env;

export default createConfig({
  privateKey,
  providerUrl,
  predicates: ['./src/predicate'],
  forcBuildFlags: ['--release'],
  output: '../sdk/src/sway',
});
