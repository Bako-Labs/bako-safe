import { FuelWalletLocked } from '@fuel-wallet/sdk';
import { AuthService } from './auth';

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

export interface IBSAFEAuth {
  address: string;
  token: string;
}

export interface IBSAFEAuthPayload {
  address: string;
  hash: string;
  createdAt: string;
  provider: string;
  encoder: string;
  user_id: string;
}
