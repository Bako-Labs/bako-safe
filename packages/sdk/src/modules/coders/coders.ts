import { BytesLike, concat, hexlify, arrayify, BigNumberCoder } from 'fuels';
import { BakoCoders } from './coder';

export enum SignatureType {
  WebAuthn = 0,
  Fuel = 1,
}

export type WebAuthnInput = {
  type: SignatureType.WebAuthn;
  signature: BytesLike;
  prefix: BytesLike;
  suffix: BytesLike;
  authData: BytesLike;
};

export type FuelInput = {
  type: SignatureType.Fuel;
  signature: BytesLike;
};

export const bakoCoder = new BakoCoders<
  SignatureType,
  WebAuthnInput | FuelInput
>();

bakoCoder.addCoder(SignatureType.WebAuthn, (data) => {
  const prefixBytes = arrayify(data.prefix);
  const suffixBytes = arrayify(data.suffix);
  const authDataBytes = arrayify(data.authData);
  return hexlify(
    concat([
      data.signature, // get Unit8Array of bn
      new BigNumberCoder('u64').encode(prefixBytes.length), // prefix size
      new BigNumberCoder('u64').encode(suffixBytes.length), // suffix size
      new BigNumberCoder('u64').encode(authDataBytes.length), // authdata size
      prefixBytes,
      suffixBytes,
      authDataBytes,
    ]),
  );
});

bakoCoder.addCoder(SignatureType.Fuel, (data) => {
  return hexlify(arrayify(data.signature));
});
