import { ProviderOptions } from 'fuels';
export { ISelectWorkspaceResponse, IBakoSafeAuth, Workspace } from '../service';

export type BakoProviderOptions = ProviderOptions & {
  token: string;
  address: string;
};

export type BakoProviderAuthOptions = BakoProviderOptions & {
  challenge: string;
  encoder?: TypeUser;
  serverUrl?: string;
};

export enum TypeUser {
  FUEL = 'FUEL',
  WEB_AUTHN = 'WEB_AUTHN',
}

export type BakoProviderSetup = {
  address: string;
  name?: string;
  encoder?: TypeUser;
  provider?: string;
};

export type BakoProviderAuth = {
  challenge: string;
  token: string;
  encoder?: TypeUser;
};
