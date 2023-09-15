import { Resources, TransactionRequest } from 'fuels';
import { ITransferAsset } from '../assets/types';
import { Vault } from '../predicates';

export interface IPayloadTransfer {
    vault: Vault;
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
    status: string;
    block: string;
    gasUsed: string;
}

export interface ITransfer {
    instanceTransaction(_coins: Resources[]): Promise<IInstanceTransfer>;
    sendTransaction(): Promise<ISendTransaction>;
    getHashTxId(): string;
    getTransaction(): TransactionRequest;
}
