import { createConfig } from 'fuels';

import dotenv from 'dotenv';

dotenv.config();

export default createConfig({
  predicates: ['./src/predicate'],
  forcBuildFlags: ['--release'],
  providerUrl: process.env.PROVIDER_URL,
  privateKey: process.env.PRIVATE_KEY,
  output: '../sdk/src/sway',
});
