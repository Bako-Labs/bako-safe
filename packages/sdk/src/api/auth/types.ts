import { TransactionRequest } from 'fuels';
import { Vault } from 'src/modules';

export enum TypeUser {
  FUEL = 'FUEL',
  WEB_AUTHN = 'WEB_AUTHN',
}

export type ApiConfigurable = {
  address?: string;
  token?: string;
  serverUrl?: string;
};

export const defaultConfig: ApiConfigurable = {
  address: '',
  token: '',
  serverUrl: 'http://localhost:3333/',
};

export enum AuthRequestHeaders {
  AUTHORIZATION = 'Authorization',
  SIGNER_ADDRESS = 'Signeraddress',
}

export interface IAuthRequestCode {
  address: string;
  provider: string;
  type?: TypeUser;
}

export interface IUserCreate {
  name: string;
  type: TypeUser;
  address: string;
  provider: string;
}

export interface Workspace {
  id: string;
  name: string;
  avatar: string;
}

export interface IBakoSafeAuth {
  address: string;
  token: string;
  worksapce?: string;
}

export interface IAuthCreateResponse {
  code: string;
  validAt: string;
  origin: string;
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

export interface ISignTransaction {
  vault: Vault;
  hash: string;
  signature: string;
  approve?: boolean;
}

export interface ISignTransactionRequest
  extends Omit<ISignTransaction, 'vault'> {}

export interface ISelectWorkspaceResponse extends Workspace {}

export interface IPredicatePayload {
  name: string;
  description?: string;
  predicateAddress: string;
  minSigners: number;
  addresses: string[];
  configurable: string;
  provider: string;
  chainId?: number;
  versionCode?: string;
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
}
