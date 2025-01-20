import { Address } from 'fuels';
import { WebAuthn } from './utils';
import { useMutation } from '@tanstack/react-query';
import { client } from '../config/client';
import { Storage, StorageKey } from '../config/storage';

export enum TypeUser {
  WEB_AUTHN = 'WEB_AUTHN',
  BAKO = 'BAKO',
}

export type CreateUserPayload = {
  address: string;
  provider: string;
  type: TypeUser;
  webauthn?: {
    id: string;
    publicKey: string;
    origin: string;
  };
};

type CreateAccountResult = {
  account: {
    id: string;
    publicKey: string;
    address: string;
  };
  challange: string;
};

type CreateAccountParams = {
  name?: string;
  provider?: string;
};

/**
 * Hook para criar uma conta no BakoProvider utilizando React Query
 */
export const WEBAUTHN_CREATE_ACCOUNT_KEY = ['createAccount'];
export const useCreateAccount = () => {
  return useMutation({
    mutationKey: WEBAUTHN_CREATE_ACCOUNT_KEY,
    mutationFn: async ({ name, provider }: CreateAccountParams) => {
      const account = await WebAuthn.createAccount(
        name || `${new Date().getTime()}`,
        `${Address.fromRandom().toString()}`,
      );

      const webauthn = {
        hardware: crypto.randomUUID(),
        id: account.credential?.id ?? '',
        publicKey: account.publicKeyHex,
        origin: window.location.origin,
      };

      return client('/user', {
        method: 'POST',
        body: JSON.stringify({
          address: account.address,
          provider: provider || 'https://testnet.fuel.network/v1/graphql',
          type: TypeUser.WEB_AUTHN,
          webauthn,
          name: name || `${new Date().getTime()}`,
        }),
      }).then(({ challange }) => {
        Storage.set([
          {
            name: StorageKey.USER_ADDRESS,
            value: account.address,
          },
          {
            name: StorageKey.WEBAUTH_HARDWARE,
            value: webauthn.hardware,
          },
          {
            name: StorageKey.USER_CHALLENGE,
            value: challange,
          },
        ]);

        return {
          webauthn,
          challange,
          address: account.address,
        };
      });
    },
  });
};
