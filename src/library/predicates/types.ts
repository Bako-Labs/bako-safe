import { ITransferAsset } from '../assets';
import { Transfer } from '../transfers';

export interface IConfVault {
    HASH_PREDUCATE: number[] | undefined;
    SIGNATURES_COUNT: number;
    SIGNERS: string[];
    network: string;
}

export interface IConfigurable {
    HASH_PREDUCATE?: number[];
    SIGNATURES_COUNT: string;
    SIGNERS: string[];
}
export interface ITransferList {
    [id: string]: Transfer;
}

export interface IPayloadVault {
    configurable: IConfVault;
    abi?: string;
    bytecode?: string;
}

export interface IVault {
    getAbi: () => { [name: string]: unknown };
    getBin: () => string;
    getConfigurable: () => IConfigurable;
    includeTransaction: (assets: ITransferAsset[], witnesses: string[]) => Promise<Transfer>;
    findTransactions: (hash: string) => Transfer | undefined;
    getTransactions: () => Transfer[];
}
