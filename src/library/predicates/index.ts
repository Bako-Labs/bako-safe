import { InputValue, Predicate } from 'fuels';
import { predicateABI, predicateBIN } from '../index';
import { makeHashPredicate, makeSubscribers } from './helpers';
import { IConfigurable, IPayloadVault, IVault } from './types';

export class Vault implements IVault {
    private predicate!: Predicate<InputValue[]>;
    private bin!: string;
    private abi!: { [name: string]: unknown };
    private network!: string;
    private chainId!: number;

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
        this.network = configurable.network;
        this.chainId = configurable.chainId;
        this.bin = _bin;
        this.abi = _abi;
        this.predicate = new Predicate(_bin, configurable.chainId, _abi, configurable.network, _configurable);
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

    public getChainId() {
        return this.chainId;
    }
}
