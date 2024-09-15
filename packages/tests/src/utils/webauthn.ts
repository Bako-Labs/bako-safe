import { arrayify, concat, hexlify, sha256 } from 'fuels';
import { secp256r1 } from '@noble/curves/p256';
import { parseSignChallangeResponse } from 'bakosafe';
import { randomBytes } from 'crypto';

type MockWebAuthnCredential = {
  address: string;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
};

export class WebAuthn {
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
      : randomBytes(64);
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
