import { bech32m } from 'bech32';
import { Address, arrayify, hexlify } from 'fuels';
import { Batch32Prefix, Batch32 } from './types';

export class PasskeyAddress {
  constructor() {
    // super();
  }

  static isPasskey(value: string): boolean {
    return value.startsWith(Batch32Prefix.PASSKEY);
  }

  static toBech32 = (address: string) =>
    <Batch32>(
      bech32m.encode(
        Batch32Prefix.PASSKEY,
        bech32m.toWords(arrayify(hexlify(address))),
      )
    );

  static fromBech32 = (address: Batch32) => {
    const { words } = bech32m.decode(address);
    const bytes = new Uint8Array(bech32m.fromWords(words));
    return hexlify(bytes);
  };
}
