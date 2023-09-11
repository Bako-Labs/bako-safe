import { TransactionRequest } from 'fuels';
import { ITransferAsset } from '../assets/types';
import { IPayloadVault } from '../predicates';

export interface IPayloadTransfer {
    vault: IPayloadVault;
    assets: ITransferAsset[];
    witnesses: string[];
}

export interface IInstanceTransfer {
    txData: TransactionRequest;
    hash: string;
}

export interface IWitnesses {
    address: string;
    status: boolean;
}

export interface IRequiredWitnesses {
    required: number;
    signed: number;
    witnesses: IWitnesses[];
}

export interface ISendTransaction {
    status: 'success' | 'failure';
    block: string;
    gasUsed: string;
    transactionResume: string;
}

export interface ITransfer {
    instanceTransaction(): Promise<IInstanceTransfer>;
    sendTransaction(): Promise<ISendTransaction>;
    setWitnesses(witnesses: string[]): string[];
    //getStatusWitnesses(): IRequiredWitnesses;
    getHashTxId(): string;
    getTransaction(): TransactionRequest;
}
