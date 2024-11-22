import { Operation, TransactionRequest } from 'fuels';
import { IBakoError } from '../../utils/errors/types';
import { TypeUser } from '../provider';
import { BAKO_SERVER_API } from '../../constantes';

export type ApiConfigurable = {
  address?: string;
  token?: string;
  serverUrl?: string;
};

export enum AuthRequestHeaders {
  AUTHORIZATION = 'Authorization',
  SIGNER_ADDRESS = 'Signeraddress',
}

export type AuthService = {
  token?: string;
  address?: string;
  serverApi?: string;
};

export interface IAuthCreateResponse {
  code: string;
  validAt: string;
  origin: string;
}

export interface IAuthRequestCode {
  address: string;
  provider: string;
  type?: TypeUser;
}

export interface IAuthSignRequest {
  digest: string;
  encoder: TypeUser;
  signature: string;
}

export interface IAuthSignResponse {
  accessToken: string;
  address: string;
  avatar: string;
  user_id: string;
  workspace: Workspace;
}

export interface BaseSummary {
  operations: Operation[];
}

export type CreateSessionResponse = {
  code: string;
};

export interface ICliSummary extends BaseSummary {
  type: 'cli';
}

export interface IConnectorSummary extends BaseSummary {
  type: 'connector';
  origin: string;
  name: string;
  image?: string;
}

export interface ICreateTransactionPayload {
  predicateAddress: string; // ADDRESS OF PREDICATE
  name?: string;
  resolver?: string;
  handle?: string;
  hash: string; // HASH OF TRANSACTION
  txData: TransactionRequest;
  status: TransactionStatus;
}

export const defaultConfig: ApiConfigurable = {
  address: '',
  token: '',
  //todo: move this string to constants file
  serverUrl: BAKO_SERVER_API,
};

export interface IBakoSafeAuth {
  address: string;
  token: string;
  worksapce?: string;
}

export interface IPredicatePayload {
  name: string;
  description?: string;
  predicateAddress: string;
  configurable: string;
  version: string;
  provider: string;
}

export interface ISelectWorkspaceResponse extends Workspace {}

export type PredicateResponse = {
  predicateAddress: string;
  configurable: {
    SIGNATURES_COUNT: number;
    SIGNERS: string[];
    HASH_PREDICATE: string;
  };
  version: string;
};

export interface ISignTransaction {
  hash: string;
  signature: string;
  approve?: boolean;
}

export interface ISignTransactionRequest
  extends Omit<ISignTransaction, 'vault'> {}

export type SignService = {
  signature: string;
  encoder: string;
  digest: string;
  userAddress: string;
};

export enum TransactionStatus {
  AWAIT_REQUIREMENTS = 'await_requirements', // -> AWAIT SIGNATURES
  PENDING_SENDER = 'pending_sender', // -> AWAIT SENDER, BEFORE AWAIT STATUS
  PROCESS_ON_CHAIN = 'process_on_chain', // -> AWAIT DONE ON CHAIN
  SUCCESS = 'success', // -> SENDED
  DECLINED = 'declined', // -> DECLINED
  FAILED = 'failed', // -> FAILED
}

export type TokenResponse = [string, number][];

export enum TransactionType {
  TRANSACTION_BLOB = 'TRANSACTION_BLOB',
  TRANSACTION_SCRIPT = 'TRANSACTION_SCRIPT',
  TRANSACTION_CREATE = 'TRANSACTION_CREATE',
  TRANSACTION_UPGRADE = 'TRANSACTION_UPGRADE',
  TRANSACTION_UPLOAD = 'TRANSACTION_UPLOAD',
  DEPOSIT = 'DEPOSIT',
}

export type TransactionBakoResponse = {
  txData: TransactionRequest;
};

export interface ITransactionResume {
  id: string;
  hash: string;
  totalSigners: number;
  requiredSigners: number;
  witnesses: IWitnesses[];
  status: TransactionStatus;
  handle?: string;
  resolver?: string;
  predicate: {
    id: string;
    address: string;
  };
  gasUsed?: string;
  sendTime?: Date;
  error?: IBakoError;
}

export type ITransactionSummary = IConnectorSummary | ICliSummary;

export type UserAuthResponse = {
  id: string;
  type: TypeUser;
  avatar: string;
  webauthn: { [key: string]: string };
  address: string;
  onSingleWorkspace: boolean;
  workspace: {
    id: string;
    name: string;
    avatar: string;
    permission: { [key: string]: string };
  };
};

export type UserCreate = {
  name: string;
  type: TypeUser;
  address: string;
  provider: string;
};

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

export interface Workspace {
  id: string;
  name: string;
  avatar: string;
}
