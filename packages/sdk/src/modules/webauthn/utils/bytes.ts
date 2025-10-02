/**
 * Byte manipulation utility functions for WebAuthn operations
 *
 * This module provides functions for converting between different byte representations
 * and finding patterns within byte arrays.
 */

/**
 * Converts a buffer to a URL-safe base64 string
 *
 * @param buffer - The buffer to convert (ArrayBuffer or Uint8Array)
 * @returns A URL-safe base64 string with '+' and '/' replaced by '-' and '_'
 *
 * @example
 * ```typescript
 * const buffer = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
 * const base64 = toBase64(buffer); // "SGVsbG8"
 * ```
 */
export function toBase64(buffer: ArrayBuffer | Uint8Array): string {
  const base64 = String.fromCharCode(...new Uint8Array(buffer));
  return base64.replaceAll('+', '-').replaceAll('/', '_');
}

/**
 * Converts a URL-safe base64 string back to an ArrayBuffer
 *
 * @param base64 - The URL-safe base64 string to convert
 * @returns An ArrayBuffer containing the decoded data
 *
 * @example
 * ```typescript
 * const base64 = "SGVsbG8"; // "Hello"
 * const buffer = fromBase64(base64); // ArrayBuffer
 * ```
 */
export function fromBase64(base64: string): ArrayBuffer {
  const t = base64.replaceAll('-', '+').replaceAll('_', '/');
  return Uint8Array.from(window.atob(t), (c) => c.charCodeAt(0)).buffer;
}

/**
 * Converts a hex string to ASCII representation
 *
 * If the input starts with '0x' and contains valid hex characters, it converts
 * the hex to ASCII. Otherwise, it treats the input as a regular string and
 * converts each character to its ASCII code.
 *
 * @param hex - The hex string to convert (with or without '0x' prefix)
 * @returns A Uint8Array containing the ASCII representation
 *
 * @example
 * ```typescript
 * const ascii1 = hexToASCII("0x48656c6c6f"); // "Hello" as ASCII codes
 * const ascii2 = hexToASCII("Hello"); // Direct string to ASCII codes
 * ```
 */
export function hexToASCII(hex: string): Uint8Array {
  // If it's a hex string, convert it to ASCII
  if (hex.startsWith('0x')) {
    hex = hex.slice(2);
    // Check if it's actually a valid hex string
    if (/^[0-9a-fA-F]+$/.test(hex)) {
      // Convert hex to ASCII
      const bytes = [];
      for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
      }
      return new Uint8Array(bytes);
    }
  }

  // If it's not a hex string, treat it as a regular string and convert to ASCII
  return Uint8Array.from(hex.split('').map((c: string) => c.charCodeAt(0)));
}

/**
 * Finds the starting index of a byte sequence within a larger byte array
 *
 * This function implements a simple pattern matching algorithm to find
 * where a sequence of bytes appears within another byte array.
 *
 * @param bytes - The byte array to search within
 * @param bytesToSearch - The byte sequence to search for
 * @returns The starting index of the sequence, or -1 if not found
 *
 * @example
 * ```typescript
 * const haystack = new Uint8Array([1, 2, 3, 4, 5, 6]);
 * const needle = new Uint8Array([3, 4]);
 * const index = findIndex(haystack, needle); // 2
 * ```
 */
export function findIndex(
  bytes: Uint8Array,
  bytesToSearch: Uint8Array,
): number {
  let acc = 0;
  let index = -1;

  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === bytesToSearch[acc]) {
      if (acc === bytesToSearch.length - 1) {
        index = i - acc;
        break;
      }
      acc += 1;
      continue;
    }
    acc = 0;
  }

  return index;
}
