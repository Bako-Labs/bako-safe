import { FuelWalletLocked } from '@fuel-wallet/sdk';

export interface IAuthService {
  createSession: () => Promise<IBSAFEAuth | undefined>;
  signerByPk: (pk: string) => Promise<void>;
  signerByAccount: (wallet: FuelWalletLocked) => Promise<void>;
}

export interface IApiConfig {
  apiUrl: string;
  authToken?: string;
  account?: string;
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
