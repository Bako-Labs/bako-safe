import axios, { AxiosInstance } from 'axios';

import { defaultConfig, AuthRequestHeaders, IUserCreate } from './types';

// keep here to sinc with the other files
export const api = axios.create({
  baseURL: defaultConfig.serverUrl,
});

// - static: non authenticated methods
//     - create: create a user
//     - sign: sign a challenge
// - instance: authenticated methods
export class Service {
  private api: AxiosInstance;
  private address?: string;
  private token?: string;

  constructor({ address, token }: { address?: string; token?: string }) {
    this.api = api;
    this.address = address;
    this.token = token;

    this.api.interceptors.request.use((config) => {
      config.headers[AuthRequestHeaders.SIGNER_ADDRESS] = this.address;
      config.headers[AuthRequestHeaders.AUTHORIZATION] = this.token;

      return config;
    });
  }

  // ------------------------ AUTH METHODS ------------------------
  async getWorkspace() {
    const { data } = await this.api.get('/workspace/by-user');
    return data;
  }

  async getToken() {
    const { data } = await this.api.get('/user/latest/tokens');

    return data;
  }

  // ------------------------ STATIC METHODS ------------------------
  static async create(params: IUserCreate) {
    const { data } = await api.post('/user', params);
    return data;
  }

  // remove typeUser:
  //  - se o usuário for to tipo FUEL, só poderá se autenticar como fuel
  // - se o usuário for do tipo WEB_AUTHN, só poderá se autenticar como WEB_AUTHN
  static async sign(params: {
    signature: string;
    encoder: string;
    digest: string;
  }) {
    const { data } = await api.post('/auth/sign-in', params);
    return data;
  }
}
