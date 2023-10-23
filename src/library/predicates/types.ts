import { IBSAFEAuth } from '../api/auth/types';
import { IListTransactions } from '../api/predicates';
import { ITransaction } from '../api/transactions';
import { ITransferAsset } from '../assets';
import { IPayloadTransfer, Transfer } from '../transfers';

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

export interface IInstanceNewTransfer {
    assets: ITransferAsset[];
    witnesses: string[];
}

export interface IPayloadVault {
    configurable: IConfVault;
    name?: string;
    description?: string;
    transactionRecursiveTimeout?: number;
    abi?: string;
    bytecode?: string;
    BSAFEAuth?: IBSAFEAuth;
}

export interface IVault {
    getAbi: () => { [name: string]: unknown };
    getBin: () => string;
    getConfigurable: () => IConfVault;
    findTransactions: (hash: string) => Transfer | undefined;
    getTransactions: (params?: IListTransactions) => Promise<ITransaction[]>;
    BSAFEIncludeTransaction: (params: IPayloadTransfer | string) => Promise<Transfer>;
}
