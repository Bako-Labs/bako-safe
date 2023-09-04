import { BN, InputValue, Predicate } from 'fuels';

export interface IConfVault {
    HASH_PREDUCATE: number[] | undefined;
    SIGNATURES_COUNT: string;
    SIGNERS: string[];
    addresses: string[];
    minSigners: number;
    network: string;
    chainId: number;
}

export interface IConfigurable {
    HASH_PREDUCATE: number[];
    SIGNATURES_COUNT: string;
    SIGNERS: string[];
}

export interface IPayloadVault {
    configurable: IConfVault;
    abi?: string;
    bytecode?: string;
}

export interface IVault {
    getPredicate: () => Promise<Predicate<InputValue[]>>;
    getBalance: () => Promise<BN>;
    getAddress: () => string;
    getAbi: () => { [name: string]: unknown };
    getBin: () => string;
    getNetwork: () => string;
    getChainId: () => number;

    configurable: IConfigurable;
}
