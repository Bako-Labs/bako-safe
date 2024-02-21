export * from './predicates';
export * from './transfers';
export * from './vault';
export * from './assets';
export * from './api/auth';
export * from './api/transactions/types';
export * from './api/predicates/types';
export { IDefaultAccount, accounts } from '../test/mocks';
export { BSafe, defaultConfig } from '../configurables';

// TODO: Remove and use this type in connector package
export enum BSAFEConnectorEvents {
  //accounts
  ACCOUNTS = 'accounts',
  CURRENT_ACCOUNT = 'currentAccount',

  // transfer
  TRANSACTION_CREATED = '[TRANSACTION_CREATED]',
  TRANSACTION_SEND = '[TRANSACTION_SEND]',

  //popup auth
  AUTH_CONFIRMED = '[AUTH_CONFIRMED]',
  AUTH_REJECTED = '[AUTH_REJECTED]',
  AUTH_DISCONECT_DAPP = '[AUTH_DISCONECT_DAPP]',
  AUTH_DISCONECT_CONFIRM = '[AUTH_DISCONECT_CONFIRM]',

  //connections
  CONNECTION = 'connection',
  POPUP_TRANSFER = '[POPUP_TRANSFER]_connected',
  CONNECTED_NETWORK = '[CONNECTED_NETWORK]',

  //default
  DEFAULT = 'message',
}
