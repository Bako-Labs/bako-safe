import { createConfig } from 'fuels';

import dotenv from 'dotenv';

dotenv.config();

const { PRIVATE_KEY: privateKey, PROVIDER_URL: providerUrl } = process.env;

export default createConfig({
  privateKey,
  providerUrl,
  predicates: ['./src/predicate'],
  forcBuildFlags: ['--release'],
  // output: '../sdk/src/sway',
  output: './out',
});

/**
 *  chamar o script de build
 *  chamar script de deploy
 *  criar um script que publica uma versao de predicate
 *   - pega o root predicate -> `import { getPredicateRoot } from 'fuels'`
 *   -
 *
 *
 *
 *
 * - run -> pnpm ts-node scripts/makeVersion.ts
 */
