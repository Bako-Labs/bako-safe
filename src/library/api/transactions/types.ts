import { IAssetTransaction, ITransferAsset } from '../../assets';

export enum TransactionStatus {
    AWAIT_REQUIREMENTS = 'AWAIT_REQUIREMENTS', // -> AWAIT SIGNATURES
    PENDING_SENDER = 'PENDING', // -> AWAIT SENDER, BEFORE AWAIT STATUS
    DONE = 'DONE' // -> SENDED
}

export interface ICreateTransactionPayload {
    predicateAddress: string; // ADDRESS OF PREDICATE
    name?: string;
    hash: string; // HASH OF TRANSACTION
    status: TransactionStatus;
    assets: ITransferAsset[];
    sendTime?: Date;
    gasUsed?: string;
    resume?: string; // RESULT
}

export interface IWitnesses {
    id: string;
    signature: string;
    account: string;
    createdAt: string;
    updatedAt: string;
}

export interface ITransaction extends ICreateTransactionPayload {
    id: string;
    createdAt: string;
    updatedAt: string;
    predicateID: string;
    assets: IAssetTransaction[];
    witnesses: IWitnesses[];
}

export interface ITransactionService {
    create: (payload: ICreateTransactionPayload) => Promise<ITransaction>;
    findByHash: (hash: string) => Promise<ITransaction>;
    findByTransactionID: (transactionId: string) => Promise<ITransaction>;
    sign: (BSAFETransactionId: string, account: string, signer: string) => Promise<ITransaction>;
}
