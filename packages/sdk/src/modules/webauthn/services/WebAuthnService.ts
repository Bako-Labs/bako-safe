/**
 * WebAuthn service functions for authentication and credential management
 *
 * This module provides core WebAuthn functionality including:
 * - Account creation and credential generation
 * - Challenge signing and response parsing
 * - Client data manipulation and formatting
 * - WebAuthn data structure handling
 */

import { arrayify, hash, hexlify, randomBytes } from 'fuels';

import { findIndex, fromBase64, hexToASCII } from '../utils';
import { getSignature, parsePublicKey, sha256 } from '../utils';

/**
 * Interface for WebAuthn authentication challenge response
 */
interface AuthenticationChallangeResponse {
  response: {
    authenticatorData: Uint8Array;
    clientDataJSON: Uint8Array;
    signature: Uint8Array;
  };
}

/**
 * Splits client data to extract challenge information
 *
 * This function parses the client data JSON and extracts the prefix and suffix
 * around the challenge value, which is essential for WebAuthn signature verification.
 *
 * @param clientData - The client data JSON as bytes (ArrayBuffer or Uint8Array)
 * @param challangeBytesInASCII - The challenge bytes in ASCII format
 * @returns An object containing the prefix and suffix around the challenge
 *
 * @throws {Error} If the challenge is not found in the client data
 *
 * @example
 * ```typescript
 * const clientData = new TextEncoder().encode('{"challenge":"abc123","type":"webauthn.get"}');
 * const challengeBytes = new TextEncoder().encode("abc123");
 * const { prefix, suffix } = splitCLientData(clientData, challengeBytes);
 * ```
 */
export function splitCLientData(
  clientData: Uint8Array | ArrayBuffer,
  challangeBytesInASCII: Uint8Array,
) {
  const clientDataArray = new Uint8Array(clientData);
  const challangeIndex = findIndex(clientDataArray, challangeBytesInASCII);
  if (challangeIndex === -1) {
    throw new Error('Challange not found!');
  }
  return {
    prefix: hexlify(clientDataArray.slice(0, challangeIndex)),
    suffix: hexlify(
      clientDataArray.slice(challangeIndex + challangeBytesInASCII.length),
    ),
  };
}

/**
 * Creates a new WebAuthn account
 *
 * This function initiates the WebAuthn credential creation process,
 * generating a new key pair and returning the credential information.
 *
 * @param username - The username for the new account
 * @param challenge - The challenge string for credential creation
 * @returns An object containing the account credentials and metadata
 *
 * @example
 * ```typescript
 * const account = await createAccount("john.doe", "random-challenge-string");
 * console.log(account.address); // The account address
 * console.log(account.publicKey); // The public key bytes
 * ```
 */
export async function createAccount(username: string, challenge: string) {
  const id = randomBytes(32);
  // @ts-ignore
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: arrayify(challenge),
      rp: {
        id: window.location.hostname,
        name: window.location.hostname,
      },
      user: {
        id,
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [
        {
          alg: -7,
          type: 'public-key',
        },
      ],
      authenticatorSelection: {
        userVerification: 'required',
        residentKey: 'preferred',
        requireResidentKey: false,
      },
      attestation: 'none',
      timeout: 60000,
    },
  });

  const response = (credential as any).response;

  const publicKey = await parsePublicKey(response.getPublicKey());
  const publicKeyHex = hexlify(new Uint8Array(publicKey.slice(1)));

  return {
    id,
    publicKey: publicKey.slice(1),
    address: hash(new Uint8Array(publicKey.slice(1))),
    authenticatorData: response.authenticatorData,
    clientData: response.clientDataJSON,
    credential,
    publicKeyHex,
  };
}

/**
 * Formats WebAuthn data for creation
 *
 * This function processes the authenticator data, client data, and signature
 * to create a standardized format for WebAuthn credential creation.
 *
 * @param authenticatorData - The authenticator data from the WebAuthn response
 * @param clientDataJSON - The client data JSON from the WebAuthn response
 * @param signature - The signature from the WebAuthn response
 * @param publicKey - The public key as a hex string
 * @returns An object containing the signature and digest
 *
 * @example
 * ```typescript
 * const result = await formatToWebAuthnCreate({
 *   authenticatorData: response.authenticatorData,
 *   clientDataJSON: response.clientDataJSON,
 *   signature: response.signature,
 *   publicKey: "0x1234..."
 * });
 * ```
 */
export async function formatToWebAuthnCreate({
  authenticatorData,
  clientDataJSON,
  signature,
  publicKey,
}: {
  authenticatorData: Uint8Array;
  clientDataJSON: Uint8Array;
  publicKey: string;
  signature: Uint8Array | ArrayBuffer;
}) {
  const authData = new Uint8Array(authenticatorData);
  const clientHash = await sha256(clientDataJSON);

  const digest = await sha256(new Uint8Array([...authData, ...clientHash]));
  const sig = getSignature(publicKey, signature, digest).sig_compact;

  return {
    sig,
    digest,
  };
}

/**
 * Parses sign challenge response
 *
 * This function processes a WebAuthn authentication response and extracts
 * the signature, digest, prefix, suffix, and authenticator data.
 *
 * @param publicKey - The public key as a hex string
 * @param challenge - The challenge string that was signed
 * @param authentication - The authentication response from the WebAuthn API
 * @returns An object containing the parsed signature data
 *
 * @example
 * ```typescript
 * const result = await parseSignChallangeResponse(
 *   "0x1234...",
 *   "challenge-string",
 *   authenticationResponse
 * );
 * console.log(result.sig); // The signature
 * console.log(result.digest); // The digest
 * ```
 */
export async function parseSignChallangeResponse(
  publicKey: string,
  challenge: string,
  authentication: AuthenticationChallangeResponse,
) {
  const challangeBytesInASCII = hexToASCII(challenge);
  const response = authentication.response;
  const authData = new Uint8Array(response.authenticatorData);
  const clientHash = await sha256(response.clientDataJSON);
  const digest = await sha256(new Uint8Array([...authData, ...clientHash]));
  return {
    ...getSignature(publicKey, response.signature, digest),
    ...splitCLientData(response.clientDataJSON, challangeBytesInASCII),
    authData: hexlify(authData),
  };
}

/**
 * Signs a challenge using WebAuthn
 *
 * This function initiates the WebAuthn authentication process by requesting
 * the user to sign a challenge with their registered credential.
 *
 * @param id - The credential ID as a base64 string
 * @param challenge - The challenge string to sign
 * @param publicKey - The public key as a hex string
 * @returns The parsed signature response
 *
 * @example
 * ```typescript
 * const result = await signChallange(
 *   "credential-id-base64",
 *   "challenge-string",
 *   "0x1234..."
 * );
 * ```
 */
export async function signChallange(
  id: string,
  challenge: string,
  publicKey: string,
) {
  const authentication = await navigator.credentials.get({
    publicKey: {
      challenge: fromBase64(challenge.slice(2)),
      rpId: window.location.hostname,
      allowCredentials: [
        {
          id: fromBase64(id),
          type: 'public-key',
          transports: ['hybrid', 'internal', 'nfc', 'usb', 'ble'],
        },
      ],
      userVerification: 'required',
      timeout: 60000,
    },
  });
  return parseSignChallangeResponse(
    publicKey,
    challenge,
    authentication as any,
  );
}
