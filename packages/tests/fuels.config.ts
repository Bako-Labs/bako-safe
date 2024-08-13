import { createConfig } from 'fuels';

import dotenv from 'dotenv';
import { accounts, networks } from './src/mocks';

dotenv.config();

export default createConfig({
  contracts: ['./src/sway/contract'],
  scripts: ['./src/sway/script'],
  providerUrl: process.env.PROVIDER_URL,
  privateKey: process.env.PRIVATE_KEY,
  output: './src/types/sway',
});
