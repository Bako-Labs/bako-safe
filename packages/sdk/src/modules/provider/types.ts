import { ProviderOptions } from 'fuels';
import { ISelectWorkspaceResponse, IBakoSafeAuth, Workspace } from './services';

/**
 * Enum para os tipos de usuário suportados
 */
export enum TypeUser {
  FUEL = 'FUEL',
  WEB_AUTHN = 'WEB_AUTHN',
  EVM = 'EVM',
}

/**
 * Opções básicas do BakoProvider
 */
export type BakoProviderOptions = ProviderOptions & {
  token: string;
  address: string;
  serverApi?: string;
  userId?: string;
  rootWallet?: string;
};

/**
 * Opções para autenticação via API Token
 */
export type BakoProviderAPITokenOptions = ProviderOptions & {
  apiToken: string;
  serverApi?: string;
};

/**
 * Opções para autenticação manual
 */
export type BakoProviderAuthOptions = BakoProviderOptions & {
  challenge: string;
  encoder?: TypeUser;
  serverUrl?: string;
};

/**
 * Configuração para setup do provider
 */
export type BakoProviderSetup = {
  address: string;
  name?: string;
  encoder?: TypeUser;
  provider: string;
  serverApi?: string;
};

/**
 * Dados de autenticação
 */
export type BakoProviderAuth = {
  challenge: string;
  token: string;
  encoder?: TypeUser;
};

// Re-export dos tipos do service
export { ISelectWorkspaceResponse, IBakoSafeAuth, Workspace };
