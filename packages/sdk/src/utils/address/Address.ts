import { Address, ZeroBytes32 } from 'fuels';

export class AddressUtils {
  static hex2string(add: string[]) {
    return add
      .filter((item: string) => item != ZeroBytes32)
      .map((item: string) => {
        return Address.fromB256(item).toString();
      });
  }
}
