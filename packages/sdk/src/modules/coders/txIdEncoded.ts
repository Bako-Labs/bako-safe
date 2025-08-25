import { arrayify } from 'fuels';
import { stringToHex } from 'viem';

/**
 * List of predicate versions that require byte array encoding for transaction IDs.
 * These are legacy versions that expect Uint8Array format instead of string format.
 */
export const BYTE_VERSION_LIST = [
  '0xfdac03fc617c264fa6f325fd6f4d2a5470bf44cfbd33bc11efb3bf8b7ee2e938',
] as const;

/**
 * Type representing predicate versions that require byte array encoding.
 */
export type BytesVersion = (typeof BYTE_VERSION_LIST)[number];

/**
 * Set of predicate versions for efficient lookup of byte-encoding requirements.
 */
const BYTE_VERSION_SET = new Set<string>(
  BYTE_VERSION_LIST as readonly string[],
);

/**
 * Gets a transaction ID encoded as Uint8Array for byte-based predicate versions.
 *
 * @param txId - The transaction ID to encode.
 * @param version - The predicate version that requires byte encoding.
 * @returns The transaction ID as a Uint8Array.
 */
export function getTxIdEncoded(txId: string, version: BytesVersion): Uint8Array;

/**
 * Gets a transaction ID encoded as string for standard predicate versions.
 *
 * @param txId - The transaction ID to encode.
 * @param version - The predicate version that uses string encoding.
 * @returns The transaction ID as a string without '0x' prefix.
 */
export function getTxIdEncoded(txId: string, version: string): string;

/**
 * Encodes a transaction ID based on the predicate version requirements.
 * Legacy versions require Uint8Array format while newer versions use string format.
 *
 * @param txId - The transaction ID to encode.
 * @param version - The predicate version determining the encoding format.
 * @returns The encoded transaction ID as Uint8Array for legacy versions or string for newer versions.
 */
export function getTxIdEncoded(
  txId: string,
  version: string,
): Uint8Array | string {
  switch (true) {
    case BYTE_VERSION_SET.has(version):
      return arrayify(txId.startsWith('0x') ? txId : `0x${txId}`);
    default:
      return txId.startsWith('0x')
        ? stringToHex(txId.slice(2))
        : stringToHex(txId);
  }
}
