import { createConfig } from 'fuels';
import dotenv from 'dotenv';

dotenv.config();

export default createConfig({
  predicates: ['./src/predicate'],
  //providerUrl: process.env.PROVIDER,
  privateKey: process.env.PRIVATE_KEY,
  output: '../sdk/src',
});
