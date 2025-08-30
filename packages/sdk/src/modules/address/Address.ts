import { bech32m } from 'bech32';
import { arrayify, hexlify, Address, ZeroBytes32, bn } from 'fuels';
import { isValidAddress } from '@ethereumjs/util';
import { Bech32Prefix, Bech32 } from './types';

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

  static isEvm(address: string): boolean {
    if (address.startsWith('0x000000000000000000000000')) {
      address = AddressUtils.parseFuelAddressToEth(address);
    }

    try {
      return isValidAddress(address);
    } catch {
      return false;
    }
  }

  static parseFuelAddressToEth(address: string): string {
    try {
      return bn(address, 'hex').toHex(20) as `0x${string}`;
    } catch {
      return address;
    }
  }
}
