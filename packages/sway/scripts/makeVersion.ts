import fs from 'fs';
import path from 'path';
import { BakoPredicateLoader } from '../out';
import { getPredicateRoot } from 'fuels';

// data conf
const PATH_ORIGIN = '../out/predicates';
const PATH_DESTINY = '../../sdk/src/sway/predicates/';

async function copyPredicate(origin: string, destiny: string) {
  if (!fs.existsSync(destiny)) {
    fs.mkdirSync(destiny, { recursive: true });
  }

  const files = fs.readdirSync(origin);
  const tsFiles = files.filter((file: string) => file.endsWith('.ts'));
  tsFiles.forEach((file: string) => {
    const sourcePath = path.join(origin, file);
    const destPath = path.join(destiny, file);

    fs.copyFileSync(sourcePath, destPath);
  });

  console.log(`Arquivos copiados para ${destiny}`);
}

async function moveFiles() {
  const rootPredicate = getPredicateRoot(BakoPredicateLoader.bytecode);

  // paths
  const dest_predicate = path.join(__dirname, PATH_DESTINY, rootPredicate);
  const dest_path = path.join(__dirname, PATH_DESTINY);
  const origin_path = path.join(__dirname, PATH_ORIGIN);

  if (!fs.existsSync(dest_predicate)) {
    fs.mkdirSync(dest_predicate, { recursive: true });
  }

  await copyPredicate(origin_path, dest_predicate);

  const files: string[] = fs.readdirSync(dest_path);
  const tsFiles: string[] = files.filter((file) => file !== 'index.ts');

  let exportStatements = '';

  tsFiles.forEach((file) => {
    console.log('[FOR_FILE]: ', file);
    exportStatements += `export * from './${rootPredicate}';\n`;
  });

  fs.writeFileSync(path.join(dest_path, 'index.ts'), exportStatements);
}

moveFiles();
