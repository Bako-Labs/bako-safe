import { createConfig } from 'fuels';

import dotenv from 'dotenv';

dotenv.config();

export default createConfig({
  predicates: ['./src/predicate'],
  forcBuildFlags: ['--release'],
  output: '../sdk/src/sway',
  privateKey: '0x001'
});
