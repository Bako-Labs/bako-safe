import axios, { AxiosInstance } from 'axios';
import { Provider, Wallet } from 'fuels';
import { IAuthService, IBSAFEAuth, TypeUser } from './types';

import { FuelWalletLocked } from '@fuel-wallet/sdk';

import { ITransaction } from '../transactions';
import { BSafe } from '../../../configurables';
import { IAccountKeys, accounts } from '../../../test/mocks';

// woking to local node just fine
export class AuthService implements IAuthService {
  public BSAFEAuth?: IBSAFEAuth;
  public client: AxiosInstance;

  protected constructor({ address, token }: IBSAFEAuth) {
    this.BSAFEAuth = {
      address,
      token,
    };
    this.client = axios.create({
      baseURL: BSafe.get('API_URL'),
      headers: {
        Authorization: token,
        Signeraddress: address,
      },
    });
  }

  static async create(account: IAccountKeys, provider: string) {
    const address = accounts[account].address;
    const pk = accounts[account].privateKey;
    const client = axios.create({
      baseURL: BSafe.get('API_URL'),
    });
    const {
      data: { code },
    } = await client.post('/user', { address, provider, type: TypeUser.FUEL });

    if (!code) throw new Error('Account not created');

    const { data } = await client.post('/auth/sign-in', {
      digest: code,
      encoder: TypeUser.FUEL,
      signature: await AuthService.signerByPk(pk, code),
    });

    return new AuthService({
      address,
      token: data.accessToken,
    });
  }

  static async signerByPk(pk: string, code: string) {
    const signer = Wallet.fromPrivateKey(
      pk,
      await Provider.create(BSafe.get('PROVIDER')),
    );
    const msg = await signer.signMessage(code);
    return msg;
  }

  static async signerByAccount(wallet: FuelWalletLocked, code: string) {
    const msg = await wallet.signMessage(code);
    return msg;
  }

  async signTransaction(
    wallet: FuelWalletLocked,
    BSAFETransactionId: string,
    approve?: boolean,
  ) {
    const { data } = await this.client.get<ITransaction>(
      `/transaction/${BSAFETransactionId}`,
    );
    const msg = await wallet.signMessage(data.hash);

    await this.client
      .put(`/transaction/signer/${BSAFETransactionId}`, {
        account: wallet.address.toString(),
        signer: msg,
        confirm: approve ?? true,
      })
      .then(() => true)
      .catch(() => false);
  }
}
