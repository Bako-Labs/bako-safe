export interface IMessage {
  sessionId: string;
  to: SocketUsernames;
  type: string;
  data: { [key: string]: any };
  request_id?: string;
}

export type ISendMessage = Pick<IMessage, 'to' | 'type' | 'data'>;

export interface IConnectedSocketUser {
  id: string;
  sessionId: string;
  username: string;
  time: number;
  request_id?: string;
}

export enum PopupActions {
  CREATE = 'create',
  SIGN = 'sign',
}

export enum SocketEvents {
  CONNECT = 'connection',
  DEFAULT = 'message',
  NOTIFICATION = 'notification',

  NEW_NOTIFICATION = '[NEW_NOTIFICATION]',
  TRANSACTION_UPDATE = '[TRANSACTION]',
  VAULT_UPDATE = '[VAULT]',

  PASSKEY_UI_CONNECTED = '[PASSKEY_UI_CONNECTED]',
  PASSKEY_UI_DISCONNECTED = '[PASSKEY_UI_CONNECTED]',

  PASSKEY_CREATE_REQUEST = '[PASSKEY_CREATE_REQUEST]',
  PASSKEY_CREATE_RESPONSE = '[PASSKEY_CREATE_RESPONSE]',

  PASSKEY_SIGN_REQUEST = '[PASSKEY_SIGN_REQUEST]',
  PASSKEY_SIGN_RESPONSE = '[PASSKEY_SIGN_RESPONSE]',
}

export enum SocketUsernames {
  PASSKEY = '[PASSKEY]',
  UI = '[UI]',
  API = '[API]',
  CONNECTOR = '[CONNECTOR]',
}

export enum AuthNotifyType {
  // update:
  // add or update a session (timeout or wk)
  // remove:
  // remove a session (logout)
  UPDATE = '[UPDATE]',
  REMOVE = '[REMOVE]',
}

// force commit
