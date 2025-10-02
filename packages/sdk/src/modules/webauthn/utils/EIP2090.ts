/**
 * EIP-2090 signature encoding and decoding utilities
 *
 * This module provides functions for working with EIP-2090 compact signatures,
 * which are a more gas-efficient alternative to traditional ECDSA signatures.
 *
 * EIP-2090 signatures encode the recovery bit (v) in the signature itself,
 * reducing the need for separate recovery bit storage.
 */

/**
 * Encodes a compact signature with EIP-2090 format
 *
 * This function takes a 64-byte compact signature and encodes the recovery bit
 * into the signature itself by modifying the 33rd byte (index 32).
 *
 * @param signatureCompact - The 64-byte compact signature to encode
 * @param parity - The recovery bit (0 or 1) to encode
 * @returns The EIP-2090 encoded signature as a Uint8Array
 *
 * @throws {Error} If the signature is not normalized (s component > 2^255)
 *
 * @example
 * ```typescript
 * const signature = new Uint8Array(64); // 64-byte signature
 * const encoded = EIP2090_encode(signature, 1); // Encode with recovery bit 1
 * ```
 */
export function EIP2090_encode(
  signatureCompact: Uint8Array,
  parity: number,
): Uint8Array {
  if (signatureCompact[32] >> 7 !== 0) {
    throw new Error(`Non-normalized signature ${signatureCompact}`);
  }
  const v = parity;
  signatureCompact[32] = (v << 7) | (signatureCompact[32] & 0x7f);
  return signatureCompact;
}

/**
 * Decodes an EIP-2090 encoded signature
 *
 * This function extracts the recovery bit from an EIP-2090 encoded signature
 * and returns both the decoded signature and the recovery bit.
 *
 * @param signatureCompact - The EIP-2090 encoded signature to decode
 * @returns An object containing the decoded signature and recovery bit
 *
 * @example
 * ```typescript
 * const encoded = new Uint8Array(64); // EIP-2090 encoded signature
 * const { signature, v } = EIP2090_decode(encoded);
 * console.log(`Recovery bit: ${v}`); // 0 or 1
 * ```
 */
export function EIP2090_decode(signatureCompact: Uint8Array): {
  signature: Uint8Array;
  v: number;
} {
  const v = (signatureCompact[32] & 0x80) !== 0;
  signatureCompact[32] = signatureCompact[32] & 0x7f;
  return {
    signature: signatureCompact,
    v: v ? 1 : 0,
  };
}
