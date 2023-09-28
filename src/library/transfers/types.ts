import { TransactionRequest } from 'fuels';
import { ITransferAsset } from '../assets/types';

export interface IPayloadTransfer {
    assets: ITransferAsset[];
    witnesses: string[];
    BSAFETransactionId?: string;
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

export interface ITransferResult {
    block: string;
    witnesses: string[];
    outputs: ITransferAsset[];
    bsafeID?: string;
    fee?: string;
    gasUsed?: string;
    status?: string;
}

export interface ISendTransaction {
    status: string;
    block: string;
    gasUsed: string;
}

export interface ITransfer {
    instanceNewTransaction(params: IPayloadTransfer): void;
    send(): void;
    getHashTxId(): string;
    getTransaction(): TransactionRequest;
}
