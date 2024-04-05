import { AuthService } from 'src/api';
import {
  IAuthCreateRequest,
  IAuthService,
  IBakoSafeAuth,
  TypeUser,
  ISelectWorkspaceResponse,
} from './types';

export class Auth {
  public BakoSafeAuth?: IBakoSafeAuth;
  client: IAuthService;
  code: string;
  address: string;
  type: TypeUser;

  protected constructor(address: string, code: string, type: TypeUser) {
    this.code = code;
    this.client = new AuthService();
    this.address = address;
    this.type = type;
  }

  static async create({
    address,
    provider,
    type = TypeUser.FUEL,
  }: IAuthCreateRequest) {
    const client = new AuthService();
    const { code } = await client.auth({ address, provider, type });
    return new Auth(address, code, type);
  }

  async sign(signature: string) {
    const { accessToken } = await this.client.sign({
      digest: this.code,
      encoder: this.type,
      signature,
    });

    this.BakoSafeAuth = {
      address: this.address,
      token: accessToken,
    };

    this.client.setAuth(this.BakoSafeAuth);

    return this.BakoSafeAuth;
  }

  async selectWorkspace(
    workspaceId: string,
  ): Promise<ISelectWorkspaceResponse> {
    return this.client.selectWorkspace(workspaceId);
  }
}
