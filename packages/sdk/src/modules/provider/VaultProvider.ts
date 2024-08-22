import { Address, Provider, ProviderOptions } from 'fuels';
import { Service } from '../../api/auth/auth';
import { TypeUser } from './types';
import { networks } from '../../../../tests/src/mocks/networks';

export type VaultProviderOptions = ProviderOptions & {
  token: string;
  address: string;
  challenge: string;
  encoder?: TypeUser;
  serverUrl?: string;
};

export class VaultProvider extends Provider {
  public options: VaultProviderOptions;
  public service: Service;

  protected constructor(providerInstance: Provider) {
    // Chama o construtor da classe base usando uma instância existente de Provider
    super(providerInstance.url, providerInstance.options);
    this.options = providerInstance.options as VaultProviderOptions;
    this.service = new Service({
      address: this.options.address,
      token: this.options.token,
    });
  }

  static async create(
    url: string,
    options: VaultProviderOptions,
  ): Promise<VaultProvider> {
    const fuelProvider = await Provider.create(url, options);
    await this.authenticate({
      challenge: options.challenge,
      token: options.token,
      encoder: options.encoder,
    });
    return new VaultProvider(fuelProvider);
  }

  public static async setup({
    address,
    encoder,
    provider,
  }: {
    address: string;
    encoder?: TypeUser;
    provider?: string;
  }) {
    const { code: challenge, ...rest } = await Service.create({
      name: 'from sdk - ' + address,
      type: encoder ?? TypeUser.FUEL,
      address: address,
      provider: provider ?? networks['LOCAL'],
    });

    return challenge;
  }

  private static async authenticate({
    challenge,
    token,
    encoder,
  }: {
    challenge: string;
    token: string;
    encoder?: TypeUser;
  }) {
    await Service.sign({
      signature: token,
      encoder: encoder ?? TypeUser.FUEL,
      digest: challenge,
    });

    return;
  }
}
