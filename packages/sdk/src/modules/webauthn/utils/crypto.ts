/**
 * Cryptographic utility functions for WebAuthn operations
 *
 * This module provides functions for cryptographic operations including:
 * - SHA-256 hashing
 * - ECDSA public key parsing and recovery
 * - Signature conversion and validation
 * - Recovery bit calculation
 */

import { secp256r1 } from '@noble/curves/p256';
import { hexlify } from 'fuels';

import { EIP2090_encode } from './EIP2090';

/**
 * Computes the SHA-256 hash of the input buffer
 *
 * @param buffer - The input data to hash (ArrayBuffer or Uint8Array)
 * @returns A Promise that resolves to a Uint8Array containing the 32-byte hash
 *
 * @example
 * ```typescript
 * const data = new TextEncoder().encode("Hello, World!");
 * const hash = await sha256(data);
 * ```
 */
export async function sha256(
  buffer: ArrayBuffer | Uint8Array,
): Promise<Uint8Array> {
  // Ensure we have a proper ArrayBuffer for crypto.subtle.digest
  let arrayBuffer: ArrayBuffer;
  if (buffer instanceof Uint8Array) {
    // Create a new ArrayBuffer from the Uint8Array to avoid type issues
    arrayBuffer = buffer.slice().buffer;
  } else {
    arrayBuffer = buffer;
  }
  return new Uint8Array(await crypto.subtle.digest('SHA-256', arrayBuffer));
}

/**
 * Parses a DER-encoded ECDSA public key and converts it to raw format
 *
 * @param publicKey - The DER-encoded public key as a Uint8Array
 * @returns A Promise that resolves to the raw public key as an ArrayBuffer
 *
 * @example
 * ```typescript
 * const derKey = new Uint8Array([...]); // DER-encoded key
 * const rawKey = await parsePublicKey(derKey);
 * ```
 */
export async function parsePublicKey(publicKey: Uint8Array) {
  // Convert Uint8Array to ArrayBuffer for crypto.subtle.importKey
  const publicKeyBuffer = publicKey.slice().buffer;
  const cryptoKey = await crypto.subtle.importKey(
    'spki',
    publicKeyBuffer,
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
      hash: 'SHA-256',
    },
    true,
    ['verify'],
  );
  return await crypto.subtle.exportKey('raw', cryptoKey);
}

/**
 * Recovers a public key from a compact signature and digest using a recovery bit
 *
 * @param signatureCompact - The compact signature (64 bytes)
 * @param digest - The message digest that was signed
 * @param recoveryBit - The recovery bit (0 or 1) to determine which public key to recover
 * @returns A hex string representing the recovered public key
 *
 * @example
 * ```typescript
 * const pubKey = recoverPublicKey(signature, digest, 0);
 * ```
 */
export function recoverPublicKey(
  signatureCompact: Uint8Array,
  digest: Uint8Array,
  recoveryBit: number,
) {
  const publicKey = secp256r1.Signature.fromCompact(signatureCompact)
    .addRecoveryBit(recoveryBit)
    .recoverPublicKey(digest);
  return `0x${publicKey.x.toString(16).padStart(64, '0')}${publicKey.y
    .toString(16)
    .padStart(64, '0')}`;
}

/**
 * Determines the correct recovery bit for a given public key and signature
 *
 * @param publicKey - The expected public key as a hex string
 * @param signatureCompact - The compact signature
 * @param digest - The message digest
 * @returns The recovery bit (0 or 1) that produces the expected public key
 *
 * @example
 * ```typescript
 * const recoveryBit = getRecoveryBit(expectedPubKey, signature, digest);
 * ```
 */
export function getRecoveryBit(
  publicKey: string,
  signatureCompact: Uint8Array,
  digest: Uint8Array,
) {
  return Number(recoverPublicKey(signatureCompact, digest, 0) !== publicKey);
}

/**
 * Converts an ASN.1 DER-encoded signature to raw format
 *
 * This function extracts the r and s components from a DER signature
 * and combines them into a 64-byte raw signature.
 *
 * @param signatureBuffer - The DER-encoded signature (ArrayBuffer or Uint8Array)
 * @returns A Uint8Array containing the raw 64-byte signature
 *
 * @example
 * ```typescript
 * const derSignature = new Uint8Array([...]); // DER signature
 * const rawSignature = convertASN1toRaw(derSignature);
 * ```
 */
export function convertASN1toRaw(signatureBuffer: ArrayBuffer | Uint8Array) {
  const usignature = new Uint8Array(signatureBuffer);

  const rStart = usignature[4] === 0 ? 5 : 4;
  const rEnd = rStart + 32;
  const sStart = usignature[rEnd + 2] === 0 ? rEnd + 3 : rEnd + 2;
  const r = usignature.slice(rStart, rEnd);
  const s = usignature.slice(sStart);
  const sig = new Uint8Array(64);
  const rs = [...r, ...s];
  sig.set(rs, 64 - rs.length);
  return sig;
}

/**
 * Processes a signature and returns various signature representations
 *
 * This function takes a DER signature, converts it to compact format,
 * determines the recovery bit, and returns multiple signature representations
 * including EIP-2090 encoded format.
 *
 * @param publicKey - The public key used for signing
 * @param signature - The DER-encoded signature
 * @param digest - The message digest that was signed
 * @returns An object containing various signature representations
 *
 * @example
 * ```typescript
 * const result = getSignature(publicKey, signature, digest);
 * console.log(result.signature); // EIP-2090 encoded signature
 * console.log(result.sig_compact); // Compact signature bytes
 * ```
 */
export function getSignature(
  publicKey: string,
  signature: Uint8Array | ArrayBuffer,
  digest: Uint8Array,
): {
  signature: string;
  digest: string;
  sig_compact: Uint8Array;
  dig_compact: Uint8Array;
} {
  const signatureCompact = secp256r1.Signature.fromCompact(
    convertASN1toRaw(signature),
  )
    .normalizeS()
    .toCompactRawBytes();
  const recoveryBit = getRecoveryBit(publicKey, signatureCompact, digest);
  const sigatureCompactCopy = new Uint8Array(signatureCompact.slice());

  return {
    signature: hexlify(EIP2090_encode(sigatureCompactCopy, recoveryBit)),
    digest: hexlify(digest),
    sig_compact: signatureCompact,
    dig_compact: digest,
  };
}
