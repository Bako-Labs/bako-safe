import * as fs from 'fs';
import * as path from 'path';
import { recently } from '.';

export function loadPredicate(version: string = recently) {
  console.log('[LOAD_PREDICATE]');

  const bakoPredicateLoaderPath = path.join(
    __dirname,
    version,
    'BakoPredicateLoader.ts',
  );

  console.log('bakoPredicateLoaderPath', bakoPredicateLoaderPath);

  if (fs.existsSync(bakoPredicateLoaderPath)) {
    const BakoPredicateLoader = require(bakoPredicateLoaderPath);

    return BakoPredicateLoader;
  }

  throw new Error(
    'Nenhum arquivo BakoPredicateLoader.ts encontrado nas pastas de hash.',
  );
}
