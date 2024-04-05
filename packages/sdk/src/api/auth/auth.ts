import {
  IAuthCreateRequest,
  IAuthCreateResponse,
  IAuthService,
  IAuthSignRequest,
  IAuthSignResponse,
  IBakoSafeAuth,
} from './types';

import { Api } from '../api';

export class AuthService extends Api implements IAuthService {
  constructor() {
    super();
  }

  public async setAuth(auth: IBakoSafeAuth) {
    this.client.defaults.headers['Authorization'] = auth.token;
    this.client.defaults.headers['Signeraddress'] = auth.address;
    return;
  }

  public async auth(params: IAuthCreateRequest): Promise<IAuthCreateResponse> {
    const { data } = await this.client.post('/user', params);
    return data;
  }

  public async sign(params: IAuthSignRequest): Promise<IAuthSignResponse> {
    const { data } = await this.client.post('/auth/sign-in', params);
    return data;
  }

  public async selectWorkspace(workspaceId: string) {
    if (!this.client.defaults.headers['Signeraddress'])
      throw new Error('Auth is required');

    const { data } = await this.client.put('/workspace', {
      workspaceId,
      userId: this.client.defaults.headers['Signeraddress'],
    });
    return data;
  }

  public async getWorkspaces() {
    if (!this.client.defaults.headers['Signeraddress'])
      throw new Error('Auth is required');
    const { data } = await this.client.get(`/workspace`);
    return data;
  }
}

// // woking to local node just fine
// export class AuthService implements IAuthService {
//   static async create(account: IAccountKeys, provider: string) {}

//   public BakoSafeAuth?: IBakoSafeAuth;
//   public client: AxiosInstance;

//   protected constructor({ address, token }: IBakoSafeAuth) {
//     this.BakoSafeAuth = {
//       address,
//       token,
//     };
//     this.client = axios.create({
//       baseURL: BakoSafe.get('SERVER_URL'),
//       headers: {
//         Authorization: token,
//         Signeraddress: address,
//       },
//     });
//   }

//   static async create(account: IAccountKeys, provider: string) {
//     const address = accounts[account].address;
//     const pk = accounts[account].privateKey;
//     const client = axios.create({
//       baseURL: BakoSafe.get('SERVER_URL'),
//     });
//     const {
//       data: { code },
//     } = await client.post('/user', { address, provider, type: TypeUser.FUEL });

//     if (!code) throw new Error('Account not created');

//     const { data } = await client.post('/auth/sign-in', {
//       digest: code,
//       encoder: TypeUser.FUEL,
//       signature: await AuthService.signerByPk(pk, code),
//     });

//     return new AuthService({
//       address,
//       token: data.accessToken,
//     });
//   }

//   static async signerByPk(pk: string, code: string) {
//     const signer = Wallet.fromPrivateKey(
//       pk,
//       await Provider.create(BakoSafe.get('PROVIDER')),
//     );
//     const msg = await signer.signMessage(code);
//     return msg;
//   }

//   static async signerByAccount(wallet: FuelWalletLocked, code: string) {
//     const msg = await wallet.signMessage(code);
//     return msg;
//   }

//   async signTransaction(
//     wallet: FuelWalletLocked,
//     BakoSafeAuthTransactionId: string,
//     approve?: boolean,
//   ) {
//     const { data } = await this.client.get<ITransaction>(
//       `/transaction/${BakoSafeAuthTransactionId}`,
//     );
//     const msg = await wallet.signMessage(data.hash);

//     await this.client
//       .put(`/transaction/signer/${BakoSafeAuthTransactionId}`, {
//         account: wallet.address.toString(),
//         signer: msg,
//         confirm: approve ?? true,
//       })
//       .then(() => true)
//       .catch(() => false);
//   }
// }
