import { bech32m } from 'bech32';
import { arrayify, hexlify, Address, ZeroBytes32 } from 'fuels';

enum Bech32Prefix {
  PASSKEY = 'passkey',
}
export type Bech32 = `${Bech32Prefix}.${string}`;

export class AddressUtils {
  static hex2string(add: string[]) {
    return add
      .filter((item: string) => item != ZeroBytes32)
      .map((item: string) => {
        return Address.fromB256(item).toString();
      });
  }

  static isPasskey(value: string): boolean {
    return value.startsWith(Bech32Prefix.PASSKEY);
  }

  static toBech32 = (address: string) =>
    <Bech32>(
      bech32m.encode(
        Bech32Prefix.PASSKEY,
        bech32m.toWords(arrayify(hexlify(address))),
      )
    );

  static fromBech32 = (address: Bech32) => {
    const { words } = bech32m.decode(address);
    const bytes = new Uint8Array(bech32m.fromWords(words));
    return hexlify(bytes);
  };
}
