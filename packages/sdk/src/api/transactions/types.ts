import { Operation, TransactionRequest } from 'fuels';
import { ITransferAsset } from '../../utils/assets';

export enum SortOptionTx {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum TransactionStatus {
  AWAIT_REQUIREMENTS = 'await_requirements', // -> AWAIT SIGNATURES
  PENDING_SENDER = 'pending_sender', // -> AWAIT SENDER, BEFORE AWAIT STATUS
  PROCESS_ON_CHAIN = 'process_on_chain', // -> AWAIT DONE ON CHAIN
  SUCCESS = 'success', // -> SENDED
  DECLINED = 'declined', // -> DECLINED
  FAILED = 'failed', // -> FAILED
}

export interface ICreateTransactionPayload {
  predicateAddress: string; // ADDRESS OF PREDICATE
  name?: string;
  hash: string; // HASH OF TRANSACTION
  txData: TransactionRequest;
  status: TransactionStatus;
  assets: ITransferAsset[];
  sendTime?: Date;
  gasUsed?: string;
}

export enum WitnessStatus {
  REJECTED = 'REJECTED',
  DONE = 'DONE',
  PENDING = 'PENDING',
}

export interface IWitnesses {
  account: string;
  signature: string;
  status: WitnessStatus;
  updatedAt: string;
}

export interface GetTransactionParams {
  predicateId?: string[];
  to?: string;
  hash?: string;
  status?: TransactionStatus[];
  perPage?: number;
  page?: number;
  orderBy?: string;
  sort?: SortOptionTx;
}

export enum TransactionProcessStatus {
  SUCCESS = 'SuccessStatus',
  SQUIZED = 'SqueezedOutStatus',
  SUBMITED = 'SubmittedStatus',
  FAILED = 'FailureStatus',
}

export interface ITransactionPredicate {
  id: string;
  address: string;
}

export interface ITransactionResume {
  id: string;
  hash: string;
  totalSigners: number;
  requiredSigners: number;
  witnesses: IWitnesses[];
  status: TransactionStatus;
  predicate: ITransactionPredicate;
  gasUsed?: string;
  sendTime?: Date;
  error?: string;
}

export interface BaseSummary {
  operations: Operation[];
}

export interface IConnectorSummary extends BaseSummary {
  type: 'connector';
  origin: string;
  name: string;
  image?: string;
}

export interface ICliSummary extends BaseSummary {
  type: 'cli';
}

export type ITransactionSummary = IConnectorSummary | ICliSummary;

export enum TransactionType {
  TRANSACTION_SCRIPT = 'TRANSACTION_SCRIPT',
  TRANSACTION_CREATE = 'TRANSACTION_CREATE',
  DEPOSIT = 'DEPOSIT',
}

export interface ITransaction
  extends Omit<ICreateTransactionPayload, 'predicateAddress'> {
  id: string;
  name: string;
  type: TransactionType;
  resume: ITransactionResume;
  summary?: ITransactionSummary;

  createdAt: string;
  updatedAt: string;
}

export interface ITransactionService {
  create: (payload: ICreateTransactionPayload) => Promise<ITransaction>;
  findByHash: (hash: string) => Promise<ITransaction>;
  findByTransactionID: (transactionId: string) => Promise<ITransaction>;
  sign: (
    BakoSafeTransactionId: string,
    account: string,
    signer: string,
    approve?: boolean,
  ) => Promise<ITransaction>;
  send: (BakoSafeTransactionId: string) => Promise<ITransactionResume>;
  verify: (BakoSafeTransactionId: string) => Promise<ITransactionResume>;
  status: (BakoSafeTransactionId: string) => Promise<TransactionStatus>;
}
