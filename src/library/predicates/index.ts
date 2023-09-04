import { InputValue, Predicate } from 'fuels';
import { predicateABI, predicateBIN } from '../index';
import { makeHashPredicate, makeSubscribers } from './helpers';
import { IConfigurable, IPayloadVault } from './types';

export class Vault {
    private predicate!: Predicate<InputValue[]>;

    public configurable!: IConfigurable;

    constructor({ configurable, abi, bytecode }: IPayloadVault) {
        const hasExists = configurable.HASH_PREDUCATE;

        const _configurable: { [name: string]: unknown } = {
            SIGNATURES_COUNT: hasExists ? configurable.SIGNATURES_COUNT : configurable.minSigners,
            SIGNERS: hasExists ? configurable.SIGNERS : makeSubscribers(configurable.addresses),
            HASH_PREDUCATE: hasExists ? configurable.HASH_PREDUCATE : makeHashPredicate()
        };

        const _abi = abi ? JSON.parse(abi) : predicateABI;
        const _bin = bytecode ? bytecode : predicateBIN;

        this.configurable = {
            HASH_PREDUCATE: _configurable.HASH_PREDUCATE as number[],
            SIGNATURES_COUNT: _configurable.SIGNATURES_COUNT as string,
            SIGNERS: _configurable.SIGNERS as string[]
        };
        this.predicate = new Predicate(_bin, configurable.chainId, _abi, configurable.network, _configurable);
    }

    public async getPredicate() {
        return this.predicate;
    }

    public async getAddress() {
        return this.predicate.address.toString();
    }

    public async getBalance() {
        return this.predicate.getBalance();
    }
}
