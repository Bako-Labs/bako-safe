import { createConfig } from 'fuels';
import dotenv from 'dotenv';

dotenv.config();

export default createConfig({
  contracts: ['./src/predicate'],
  providerUrl: process.env.PROVIDER,
  privateKey: process.env.PRIVATE_KEY,
  output: '../sdk/src/contracts',
});
