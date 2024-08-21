import { Provider, ProviderOptions } from 'fuels';

import { TypeUser } from './types';
import { Api } from 'src/api/api';

export class VaultProvider extends Provider {
  // readonly service: any;
  readonly isAutenticated: boolean;
  readonly challenge: string | undefined;
  public signature: string;

  protected constructor(
    providerInstance: Provider,
    service: any,
    challenge: string | undefined = undefined,
  ) {
    // Chama o construtor da classe base usando uma instância existente de Provider
    super(providerInstance.url, providerInstance.options);
    this.isAutenticated = false;
    this.challenge = challenge;
    this.signature = '';
  }

  static async create(
    url: string,
    options?: ProviderOptions & {
      encoder: TypeUser;
      token: string;
      address: string;
      serverUrl: string;
    },
  ): Promise<VaultProvider> {
    const hasRequiredOptionsAuth = options?.encoder && options?.address;
    const providerInstance = await Provider.create(url, options);
    // const service = new Api({
    //   address: options?.address, //remove address of requests
    //   signature: options?.token,
    //   serverUrl: options?.serverUrl,
    // });

    const challenge = hasRequiredOptionsAuth
      ? await VaultProvider.newChallenge(options.address, url, options.encoder)
      : undefined;

    return new VaultProvider(providerInstance, challenge);
  }

  async autenticate(signature: string) {
    this.signature = signature;
  }

  static async newChallenge(
    address: string,
    provider: string,
    encoder: TypeUser,
  ) {
    const service = new Api({});

    const {
      data: { code: challenge },
    } = await service.post('/user', {
      address,
      provider,
      encoder,
    });

    return challenge;
  }
}
