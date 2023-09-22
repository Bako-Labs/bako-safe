export enum TransactionStatus {
    AWAIT_REQUIREMENTS = 'AWAIT_REQUIREMENTS', // -> AWAIT SIGNATURES
    PENDING_SENDER = 'PENDING', // -> AWAIT SENDER, BEFORE AWAIT STATUS
    DONE = 'DONE' // -> SENDED
}

export interface ICreateTransactionPayload {
    predicateAddress: string; // ADDRESS OF PREDICATE
    name?: string;
    txData: string; // TRANSACTION REQUESTFY
    hash: string; // HASH OF TRANSACTION
    status: TransactionStatus;
    sendTime?: Date;
    gasUsed?: string;
    resume?: string; // RESULT
}

export interface ITransactionService {
    create: (payload: ICreateTransactionPayload) => Promise<ICreateTransactionPayload>;
    findByHash: (hash: string) => Promise<ICreateTransactionPayload>;
}
