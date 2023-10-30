import { assets } from '../../mocks';
import { Address } from 'fuels';

export class AddressUtils {
    static hex2string(add: string[]) {
        return add
            .filter((item: string) => item != assets['ETH'])
            .map((item: string) => {
                return Address.fromB256(item).toString();
            });
    }
}
