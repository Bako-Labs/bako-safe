import { ITransferAsset } from '../assets';
import { Transfer } from '../transfers';

export interface IConfVault {
    HASH_PREDUCATE?: number[];
    SIGNATURES_COUNT: number;
    SIGNERS: string[];
    network: string;
    chainId: number;
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
    getConfigurable: () => IConfVault;
    includeTransaction: (assets: ITransferAsset[], witnesses: string[]) => Promise<Transfer>;
    findTransactions: (hash: string) => Transfer | undefined;
    getTransactions: () => Transfer[];
}
