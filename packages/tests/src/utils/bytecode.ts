import { arrayify, chunkAndPadBytes, hexlify } from 'fuels';
import { STATE_TRANSITION_WASM_BYTECODE } from '../mocks';
import { calcRoot, constructTree, getProof } from '@fuel-ts/merkle';

export function subsectionFromBytecode() {
  const subsectionSize = 64 * 1024;
  const subsectionsChunk = chunkAndPadBytes(
    arrayify(STATE_TRANSITION_WASM_BYTECODE),
    subsectionSize,
  ).map(hexlify);

  const merkleTree = constructTree(subsectionsChunk);
  const merkleRoot = calcRoot(subsectionsChunk);

  const subsections = subsectionsChunk.map((subsection, index) => {
    const proofSet = getProof(merkleTree, index);

    return {
      proofSet,
      subsection,
      root: merkleRoot,
      subsectionIndex: index,
      proofSetCount: proofSet.length,
      subsectionsNumber: subsectionsChunk.length,
    };
  });

  return { subsections, merkleRoot };
}
