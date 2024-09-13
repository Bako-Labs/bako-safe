import dotenv from 'dotenv';
import { createConfig } from 'fuels';

import { networks, accounts } from './src/mocks';

dotenv.config();

export default createConfig({
  contracts: ['./src/sway/contract'],
  scripts: ['./src/sway/script'],
  providerUrl: networks['LOCAL'],
  privateKey: accounts['USER_1'].privateKey,
  output: './src/types/sway',
});
