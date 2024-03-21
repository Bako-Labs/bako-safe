import { createConfig } from 'fuels';

import dotenv from 'dotenv';

dotenv.config();

export default createConfig({
  predicates: ['./src/predicate'],
  scripts: ['./src/scripts'],
  useBuiltinForc: false,
  providerUrl: process.env.PROVIDER_URL,
  privateKey: process.env.PRIVATE_KEY,
  output: '../sdk/src',
});
