import { InputValue, Predicate } from 'fuels';
import { predicateABI, predicateBIN } from '../index';
import { makeHashPredicate, makeSubscribers } from './helpers';
import { IConfVault, IConfigurable, IPayloadVault, IVault } from './types';
export * from './types';

export class Vault implements IVault {
    private predicate!: Predicate<InputValue[]>;
    private bin!: string;
    private abi!: { [name: string]: unknown };
    private network!: string;

    public configurable!: IConfigurable;

    constructor({ configurable, abi, bytecode }: IPayloadVault) {
        this.abi = abi ? JSON.parse(abi) : predicateABI;
        this.bin = bytecode ? bytecode : predicateBIN;
        this.network = 'https://beta-3.fuel.network/graphql';

        !(configurable instanceof Predicate) ? this.makePredicate(configurable, JSON.stringify(this.abi)) : (this.predicate = configurable);
    }

    private makePredicate(configurable: IConfVault, abi: string) {
        const hasExists = configurable.HASH_PREDUCATE;
        const _configurable: { [name: string]: unknown } = {
            SIGNATURES_COUNT: hasExists ? configurable.SIGNATURES_COUNT : configurable.minSigners,
            SIGNERS: hasExists ? configurable.SIGNERS : makeSubscribers(configurable.addresses),
            HASH_PREDUCATE: hasExists ? configurable.HASH_PREDUCATE : makeHashPredicate()
        };

        this.configurable = {
            HASH_PREDUCATE: _configurable.HASH_PREDUCATE as number[],
            SIGNATURES_COUNT: _configurable.SIGNATURES_COUNT as string,
            SIGNERS: _configurable.SIGNERS as string[]
        };
        this.predicate = new Predicate(this.bin, JSON.parse(abi), this.network, _configurable);
    }

    public async getPredicate() {
        return await this.predicate;
    }

    public async getBalance() {
        return await this.predicate.getBalance();
    }

    public getAddress() {
        return this.predicate.address.toString();
    }

    public getAbi() {
        return this.abi;
    }

    public getBin() {
        return this.bin;
    }

    public getNetwork() {
        return this.network;
    }
}
