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

export interface ISelectWorkspaceResponse extends Workspace {}
