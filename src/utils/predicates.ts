import { Address } from 'fuels';

const values = {
    signature: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    address: '0x0000000000000000000000000000000000000000000000000000000000000000'
};

export class PredicateUtils {
    // todo: move signatures_length do tynamic data
    static async makeSignatures(subscribers: string[]) {
        const array = [];
        const signatures_length = subscribers.length;
        for (let i = 0; i < 10; i++) {
            if (i < signatures_length) {
                array.push(subscribers[i]);
            } else {
                //todo: verify change user_aux by '0x00...0'
                //0x004547f2908384a8d0af1cfd3051984edd07476b53cf1bcfcad1ede79ce2c0546cb3cd00ca8c3232046420ff43fc1935b6449320caf443d2a2ee5ca34e37a1d9
                array.push(values['signature']);
            }
        }

        return array;
    }

    static async makeSubscribers(subscribers: string[]) {
        const array = [];
        const signatures_length = subscribers.length;
        for (let i = 0; i < 10; i++) {
            if (i < signatures_length) {
                array.push(Address.fromString(subscribers[i]).toHexString());
            } else {
                array.push(values['address']);
            }
        }

        return array;
    }

    static async makeHashPredicate() {
        const array = [];

        const random = () => {
            return Math.round(Math.random() * 10);
        };

        for (let i = 0; i < 20; i++) {
            array.push(random());
        }

        return array;
    }
}
