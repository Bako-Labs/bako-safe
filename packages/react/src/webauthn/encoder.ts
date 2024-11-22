import { concat } from 'ethers';
import { arrayify, BigNumberCoder } from 'fuels';

enum SignatureType {
  WEB_AUTHN = 0,
  FUEL = 1,
}

type Signature =
  | {
      type: SignatureType.WEB_AUTHN;
      signature: string;
      prefix: string;
      suffix: string;
      authData: string;
    }
  | {
      type: SignatureType.FUEL;
      signature: string;
    };

function encodeSignature(sig: Signature) {
  const typeBytes = new BigNumberCoder('u64').encode(sig.type);
  switch (sig.type) {
    case SignatureType.WEB_AUTHN: {
      const prefixBytes = arrayify(sig.prefix);
      const suffixBytes = arrayify(sig.suffix);
      const authDataBytes = arrayify(sig.authData);
      return concat([
        typeBytes,
        sig.signature, // get Unit8Array of bn
        new BigNumberCoder('u64').encode(prefixBytes.length),
        new BigNumberCoder('u64').encode(suffixBytes.length),
        new BigNumberCoder('u64').encode(authDataBytes.length),
        prefixBytes,
        suffixBytes,
        authDataBytes,
      ]);
    }
    case SignatureType.FUEL:
      return concat([typeBytes, sig.signature]);
    default:
      throw new Error('Not implemented');
  }
}

export { encodeSignature, type Signature, SignatureType };
