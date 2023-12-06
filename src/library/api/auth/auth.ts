import axios, { AxiosInstance } from 'axios';
import { Provider, Wallet } from 'fuels';
import { IAuthService, IBSAFEAuth, IBSAFEAuthPayload } from './types';
import { defaultConfigurable } from '../../../configurables';
import { FuelWalletLocked } from '@fuel-wallet/sdk';
import { v4 as uuidv4 } from 'uuid';
import { ITransaction } from '../transactions';

// woking to local node just fine
export class AuthService implements IAuthService {
  private client: AxiosInstance;
  private payloadSession: IBSAFEAuthPayload;
  private signature?: string;
  public BSAFEAuth?: IBSAFEAuth;

  protected constructor(payload: IBSAFEAuthPayload) {
    this.client = axios.create({
      baseURL: defaultConfigurable.api_url,
    });
    this.payloadSession = payload;
  }

  static async create(user: string, provider: string) {
    const { data } = await axios
      .create({
        baseURL: defaultConfigurable.api_url,
      })
      .post('/user', {
        address: user,
        provider,
      });

    return new AuthService({
      address: user,
      hash: uuidv4(),
      createdAt: new Date().toISOString(),
      provider,
      encoder: 'fuel',
      user_id: data.id,
    });
  }

  //todo: verify date of payloadSession
  async createSession() {
    if (!this.signature) throw new Error('Signature not found');
    const { address } = this.payloadSession;

    const { data } = await this.client.post('/auth/sign-in', {
      ...this.payloadSession,
      signature: this.signature,
    });

    const result: IBSAFEAuth = {
      address,
      token: data.accessToken,
    };

    this.client.defaults.headers.common['Authorization'] = data.accessToken;
    this.client.defaults.headers.common['Signeraddress'] = address;

    this.BSAFEAuth = result;

    return result;
  }

  async signerByPk(pk: string) {
    const signer = Wallet.fromPrivateKey(
      pk,
      await Provider.create(defaultConfigurable['provider']),
    );
    const msg = await signer.signMessage(JSON.stringify(this.payloadSession));
    this.signature = msg;
  }

  async signerByAccount(wallet: FuelWalletLocked) {
    const msg = await wallet.signMessage(JSON.stringify(this.payloadSession));
    this.signature = msg;
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
