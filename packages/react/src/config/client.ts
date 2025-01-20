import { Storage, StorageKey } from './storage';

//const bakostg = Storage.get(StorageKey.SERVER_URL)
const bakostg = 'https://stg-api.bako.global';
export const client = async (
  endpoint: string,
  options: RequestInit = {
    method: 'GET',
  },
) => {
  const URL = `${bakostg}${endpoint}`;

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

  try {
    const response = await fetch(URL, fetchOptions);
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'Erro desconhecido',
      }));
      throw new Error(error.message || `Erro ${response.status}`);
    }
    return await response.json();
  } catch (error_1) {
    console.error('Erro na API:', error_1);
    throw error_1;
  }
};
