import axios, { AxiosInstance } from 'axios';
import { IBSAFEAuth } from './auth/types';
import { defaultConfig } from '../../configurables';

export class Api {
  public client: AxiosInstance;

  constructor(auth: IBSAFEAuth) {
    this.client = axios.create({
      baseURL: defaultConfig['API_URL'],
      headers: {
        Authorization: auth.token,
        Signeraddress: auth.address,
      },
    });
  }
}
