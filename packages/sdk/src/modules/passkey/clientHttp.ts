import { Storage, StorageKey } from './storage';
import { HTTP_URL } from './constants';

export const client = (
  endpoint: string,
  options: RequestInit = {
    method: 'GET',
  },
) => {
  const URL = `${HTTP_URL}${endpoint}`;

  const headers: HeadersInit = {
    ...options.headers,
    'Content-Type': 'application/json',
    SignerAddress: Storage.get(StorageKey.USER_ADDRESS),
    Authorization: Storage.get(StorageKey.USER_TOKEN),
  };

  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };

  return fetch(URL, fetchOptions)
    .then((response) => {
      if (!response.ok) {
        return response
          .json()
          .catch(() => ({
            message: 'Erro desconhecido',
          }))
          .then((error) => {
            throw new Error(error.message || `Erro ${response.status}`);
          });
      }
      return response.json();
    })
    .catch((error) => {
      console.error('Erro na API:', error);
      throw error;
    });
};
