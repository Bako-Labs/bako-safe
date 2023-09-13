import { ITransferAsset } from '../assets';
import { Transfer } from '../transfers';

export interface IConfVault {
    HASH_PREDUCATE: number[] | undefined;
    SIGNATURES_COUNT: number;
    SIGNERS: string[];
    network: string;
}
export interface IVaultTransfer {
    hash: string;
    transaction: Transfer;
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
    getAbi: () => { [name: string]: unknown };
    getBin: () => string;
    getConfigurable: () => IConfigurable;
    includeTransaction: (assets: ITransferAsset[], witnesses: string[]) => Promise<IVaultTransfer>;
    findTransactions: (hash: string) => IVaultTransfer | undefined;
    getTransactions: () => IVaultTransfer[];
}
