/**
 * WebAuthn utility class for testing purposes
 *
 * This class provides mock WebAuthn functionality for testing scenarios,
 * including credential creation and challenge signing without requiring
 * actual hardware authenticators.
 */

import { arrayify, concat, hexlify, sha256 } from 'fuels';
import { secp256r1 } from '@noble/curves/p256';
import { parseSignChallangeResponse } from 'bakosafe';
import { randomBytes } from 'crypto';

/**
 * Mock WebAuthn credential structure for testing
 */
type MockWebAuthnCredential = {
  address: string;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
};

/**
 * WebAuthn utility class for testing and development
 *
 * This class provides mock implementations of WebAuthn operations
 * that can be used in test environments without requiring actual
 * hardware authenticators or browser WebAuthn APIs.
 */
export class WebAuthn {
  /**
   * Creates mock WebAuthn credentials for testing
   *
   * This method generates a new key pair and creates a mock credential
   * that can be used for testing WebAuthn functionality.
   *
   * @param initialPrivateKey - Optional private key to use (for deterministic testing)
   * @returns A mock WebAuthn credential with address, public key, and private key
   *
   * @example
   * ```typescript
   * const credential = WebAuthn.createCredentials();
   * console.log(credential.address); // The credential address
   * console.log(credential.publicKey); // The public key bytes
   * ```
   */
  static createCredentials(initialPrivateKey?: string): MockWebAuthnCredential {
    const privateKey = initialPrivateKey
      ? arrayify(initialPrivateKey)
      : secp256r1.utils.randomPrivateKey();
    const fullPublicKey = secp256r1.getPublicKey(privateKey, false);
    const publicKey = fullPublicKey.slice(1);

    return {
      address: sha256(publicKey),
      publicKey,
      privateKey,
    };
  }

  /**
   * Signs a challenge using mock WebAuthn credentials
   *
   * This method simulates the WebAuthn challenge signing process by:
   * 1. Creating mock client data JSON
   * 2. Generating authenticator data
   * 3. Computing the digest and signing it
   * 4. Parsing the response using the actual parseSignChallangeResponse function
   *
   * @param credential - The mock credential to use for signing
   * @param challenge - The challenge string to sign
   * @param options - Optional configuration for the signing process
   * @param options.authenticatorData - Custom authenticator data to use
   * @param options.addRandom - Whether to add random data to client data JSON
   * @returns The parsed signature response with sig, digest, prefix, suffix, and authData
   *
   * @example
   * ```typescript
   * const credential = WebAuthn.createCredentials();
   * const result = WebAuthn.signChallenge(credential, "challenge123");
   * console.log(result.sig); // The signature
   * console.log(result.digest); // The digest
   * ```
   */
  static signChallenge(
    credential: MockWebAuthnCredential,
    challenge: string,
    options?: {
      authenticatorData: string;
      addRandom: boolean;
    },
  ) {
    const dataJSON: Record<string, string | boolean> = {
      type: 'webauthn.get',
      challenge,
      origin: 'http://mocktest.test',
      crossOrigin: false,
    };
    // Emulates random data injected by WebAuthn to make sure
    // that developers know that dataJSON struct can change over time
    if (
      (!options?.addRandom && Math.random() * 100 > 40) ||
      options?.addRandom
    ) {
      dataJSON.random = 'Random data';
    }
    // On this case we ignore the authenticatorData field and just generate random data
    const authenticatorData = options
      ? arrayify(options.authenticatorData)
      : (() => { const buf = randomBytes(64); return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength); })();
    // Convert the dataJSON to a byte array
    const clientDataJSON = new TextEncoder().encode(JSON.stringify(dataJSON));
    // Hash data in the same order webauthn does before signing
    const clientHash = sha256(clientDataJSON);
    const digest = sha256(concat([authenticatorData, clientHash]));
    // Sign the digest using the credential private key
    const sig = secp256r1.sign(digest.slice(2), credential.privateKey);

    const mockReponseWebAuthn = {
      response: {
        signature: sig.toDERRawBytes(false),
        authenticatorData,
        clientDataJSON,
      },
    };
    return parseSignChallangeResponse(
      hexlify(credential.publicKey),
      challenge,
      mockReponseWebAuthn,
    );
  }
}
