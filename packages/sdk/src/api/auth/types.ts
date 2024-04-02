export interface IAuthService {}

export interface IApiConfig {
  apiUrl: string;
  authToken?: string;
  account?: string;
}

export enum TypeUser {
  FUEL = 'FUEL',
  WEB_AUTHN = 'WEB_AUTHN',
}

export interface IBakoSafeAuth {
  address: string;
  token: string;
}

export interface IBakoSafeAuthPayload {
  address: string;
  hash: string;
  createdAt: string;
  provider: string;
  encoder: string;
  user_id: string;
}
