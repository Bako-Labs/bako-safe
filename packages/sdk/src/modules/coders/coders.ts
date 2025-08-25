import { BytesLike, concat, hexlify, arrayify, BigNumberCoder } from 'fuels';
import { splitSignature } from '@ethersproject/bytes';
import { hexToBytes } from '@ethereumjs/util';

import { BakoCoders } from './coder';

export enum SignatureType {
  WebAuthn = 0,
  Fuel = 1,
  Evm = 2,
  RawNoPrefix = 9,
}

export const SIGNATURE_TYPE_HEX = {
  [SignatureType.WebAuthn]: '0000000000000000',
  [SignatureType.Fuel]: '0000000000000001',
  [SignatureType.Evm]: '0000000000000002',
  [SignatureType.RawNoPrefix]: '0000000000000009',
} as const;

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

export type EvmInput = {
  type: SignatureType.Evm;
  signature: BytesLike;
};

export type RawNoPrefixInput = {
  type: SignatureType.RawNoPrefix;
  signature: BytesLike;
};

export const bakoCoder = new BakoCoders<
  SignatureType,
  WebAuthnInput | FuelInput | EvmInput | RawNoPrefixInput
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

bakoCoder.addCoder(SignatureType.Evm, (data) => {
  return splitSignature(hexToBytes(hexlify(data.signature))).compact;
});

bakoCoder.addCoder(SignatureType.RawNoPrefix, (data) => {
  return splitSignature(hexToBytes(hexlify(data.signature))).compact;
});
