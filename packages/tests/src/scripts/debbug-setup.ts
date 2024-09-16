import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const FUNCTION_CALL = `configurable {
    SIGNERS: [b256; 10] = EMPTY_SIGNERS,
    SIGNATURES_COUNT: u64 = 0,
    HASH_PREDICATE: b256 = ZERO_B256,
}

fn main() -> bool {`;
const FUNCTION_CALL_REPLACEMENT = `struct PredicateConfig {
    SIGNERS: [b256; 10],
    SIGNATURES_COUNT: u64,
    HASH_PREDICATE: b256,
}

fn main(tx_id: b256, config: PredicateConfig) -> bool {
    let SIGNERS = config.SIGNERS;
    let SIGNATURES_COUNT = config.SIGNATURES_COUNT;
    let HASH_PREDICATE = config.HASH_PREDICATE;`;

const REPLACEMENTS = [
  ['predicate;', 'script;'],
  [FUNCTION_CALL, FUNCTION_CALL_REPLACEMENT],
  ['b256_to_ascii_bytes(tx_id());', 'b256_to_ascii_bytes(tx_id);'],
];

function main() {
  const predicateFile = readFileSync(
    join(__dirname, '../../../sway/src/predicate/src/main.sw'),
  );
  let swayFile = predicateFile.toString();

  for (const [from, to] of REPLACEMENTS) {
    swayFile = swayFile.replace(from, to);
  }

  writeFileSync(join(__dirname, '../sway/script/src/main.sw'), swayFile);
}

main();
