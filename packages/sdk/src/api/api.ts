import axios, { AxiosInstance } from 'axios';
import { IBakoSafeAuth } from './auth/types';
import { BakoSafe } from '../../configurables';

export class Api {
  public client: AxiosInstance;

  constructor(auth: IBakoSafeAuth) {
    this.client = axios.create({
      baseURL: BakoSafe.get('SERVER_URL'),
      headers: {
        Authorization: auth.token,
        Signeraddress: auth.address,
      },
    });
  }
}
