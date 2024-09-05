// import { Operation, TransactionRequest } from 'fuels';
// import { ITransferAsset } from '../../utils/assets';
// import { IBakoError } from '../../utils/errors/types';

// export interface ICreateTransactionPayload {
//   predicateAddress: string; // ADDRESS OF PREDICATE
//   name?: string;
//   hash: string; // HASH OF TRANSACTION
//   txData: TransactionRequest;
//   status: TransactionStatus;
// }

// export interface GetTransactionParams {
//   predicateId?: string[];
//   to?: string;
//   hash?: string;
//   status?: TransactionStatus[];
//   perPage?: number;
//   page?: number;
//   orderBy?: string;
//   sort?: SortOptionTx;
// }

// export enum TransactionProcessStatus {
//   SUCCESS = 'SuccessStatus',
//   SQUIZED = 'SqueezedOutStatus',
//   SUBMITED = 'SubmittedStatus',
//   FAILED = 'FailureStatus',
// }

// export interface ITransactionPredicate

// export enum TransactionType {
//   TRANSACTION_SCRIPT = 'TRANSACTION_SCRIPT',
//   TRANSACTION_CREATE = 'TRANSACTION_CREATE',
//   DEPOSIT = 'DEPOSIT',
// }

// export interface ITransaction
//   extends Omit<ICreateTransactionPayload, 'predicateAddress'> {
//   id: string;
//   name: string;
//   type: TransactionType;
//   resume: ITransactionResume;
//   summary?: ITransactionSummary;

//   createdAt: string;
//   updatedAt: string;
// }

// export interface ITransactionService {
//   create: (payload: ICreateTransactionPayload) => Promise<ITransaction>;
//   findByHash: (hash: string) => Promise<ITransaction>;
//   findByTransactionID: (transactionId: string) => Promise<ITransaction>;
//   sign: (
//     BakoSafeTransactionId: string,
//     account: string,
//     signer: string,
//     approve?: boolean,
//   ) => Promise<ITransaction>;
//   send: (BakoSafeTransactionId: string) => Promise<ITransactionResume>;
//   verify: (BakoSafeTransactionId: string) => Promise<ITransactionResume>;
//   status: (BakoSafeTransactionId: string) => Promise<TransactionStatus>;
// }
