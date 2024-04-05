export interface IApiConfig {
  apiUrl: string;
  authToken?: string;
  account?: string;
}

export enum TypeUser {
  FUEL = 'FUEL',
  WEB_AUTHN = 'WEB_AUTHN',
}

export interface IBakoSafeAuth {
  address: string;
  token: string;
}

export interface IBakoSafeAuthPayload {
  address: string;
  hash: string;
  createdAt: string;
  provider: string;
  encoder: string;
  user_id: string;
}

export interface IAuthCreateRequest {
  address: string;
  provider: string;
  type: TypeUser;
}

export interface IAuthCreateResponse {
  code: string;
  validAt: string;
  origin: string;
}

export interface IAuthSignRequest {
  digest: string;
  encoder: string;
  signature: string;
}

export interface IAuthSignResponse {
  accessToken: string;
  address: string;
  avatar: string;
  user_id: string;
}

export interface ISelectWorkspaceResponse {
  workspace: {
    id: string;
    name: string;
    avatar: string;
  };
  single: boolean;
}

export interface IAuthService {
  auth: (params: IAuthCreateRequest) => Promise<IAuthCreateResponse>;
  sign: (params: IAuthSignRequest) => Promise<IAuthSignResponse>;
  setAuth: (auth: IBakoSafeAuth) => Promise<void>;
  selectWorkspace: (workspaceId: string) => Promise<ISelectWorkspaceResponse>;
  getWorkspaces: () => Promise<ISelectWorkspaceResponse>;
}
