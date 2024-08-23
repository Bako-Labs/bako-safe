import axios, { type AxiosInstance } from 'axios';
import { BakoSafe } from '../../configurables';
import type { IBakoSafeAuth } from './auth/types';

export class Api {
  public client: AxiosInstance;

  constructor(auth?: IBakoSafeAuth) {
    this.client = axios.create({
      baseURL: BakoSafe.getProviders('SERVER_URL'),
      headers: {
        Authorization: auth?.token,
        Signeraddress: auth?.address,
      },
    });
  }
}
