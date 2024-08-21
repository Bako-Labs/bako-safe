import {
  AuthRequestHeaders,
  IAuthCreateRequest,
  IAuthCreateResponse,
  IAuthService,
  IAuthSignRequest,
  IAuthSignResponse,
  IBakoSafeAuth,
  ISelectWorkspaceResponse,
} from './types';

import { Api } from '../api';

export class AuthService extends Api {
  readonly challenge: string;

  constructor(code: string) {
    super();
    this.challenge = code;
  }

  public setAuth(auth: IBakoSafeAuth) {
    this.client.defaults.headers[AuthRequestHeaders.AUTHORIZATION] = auth.token;
    this.client.defaults.headers[AuthRequestHeaders.SIGNER_ADDRESS] =
      auth.address;
  }

  public async code(params: IAuthCreateRequest): Promise<IAuthCreateResponse> {
    const { data } = await this.client.post('/user', params);
    return data;
  }

  public async sign(params: IAuthSignRequest): Promise<IAuthSignResponse> {
    const { data } = await this.client.post('/auth/sign-in', params);
    return data;
  }

  public async selectWorkspace(
    workspaceId: string,
  ): Promise<ISelectWorkspaceResponse> {
    if (!this.client.defaults.headers[AuthRequestHeaders.SIGNER_ADDRESS])
      throw new Error('Auth is required');

    const { data } = await this.client.put('/auth/workspace', {
      workspaceId,
      userId: this.client.defaults.headers[AuthRequestHeaders.SIGNER_ADDRESS],
    });
    return data;
  }

  public async getWorkspaces(): Promise<ISelectWorkspaceResponse[]> {
    if (!this.client.defaults.headers[AuthRequestHeaders.SIGNER_ADDRESS])
      throw new Error('Auth is required');
    const { data } = await this.client.get(`/workspace/by-user`);
    return data;
  }
}
