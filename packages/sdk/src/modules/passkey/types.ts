export enum JSONRpcMessageRequest {
  CREATE_ACCOUNT = 'createAccount',
  SIGN_MESSAGE = 'signMessage',
}

export enum PopupActions {
  CREATE = 'PASSKEY_UI_CREATE',
  SIGN = 'PASSKEY_UI_SIGN',
}

export type Account = {
  conf: {
    version: string;
    SIGNATURES_COUNT: number;
    SIGNERS: string[];
    HASH_PREDICATE?: string;
  };
  predicateAddress: string;
  signerAddress: string;
  hardware: string;
  origin: string;
  publickKey: string;
  id: string;
};

export type CreateAccountRequest = {
  id: string;
  account: {
    address: string;
    origin: string;
    publicKey: string;
  };
};

export type SignMessageRequest = {
  authData: string;
  prefix: string;
  suffix: string;
  signature: string;
  digest: string;
  sig_compact: Uint8Array;
  dig_compact: Uint8Array;
};
