import axios, { AxiosInstance } from 'axios';
import { IBSAFEAuth } from './auth/types';

const { API_URL } = process.env;

export class Api {
  public client: AxiosInstance;

  constructor(auth: IBSAFEAuth) {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        Authorization: auth.token,
        Signeraddress: auth.address,
      },
    });
  }
}
