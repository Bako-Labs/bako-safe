import { createConfig } from 'fuels';

import dotenv from 'dotenv';

dotenv.config();

export default createConfig({
  predicates: ['./src/predicate'],
  forcBuildFlags: ['--release'],
  output: '../sdk/src/sway',
  providerUrl: '',
  privateKey: '0x0001',
});
