import {
  CreateTransactionRequest,
  Provider,
  ProviderOptions,
  ScriptTransactionRequest,
  TransactionRequest,
  TransactionResponse,
} from 'fuels';
import { Service } from '../../api/auth/auth';
import { TypeUser } from './types';
import { networks } from '../../../../tests/src/mocks/networks';
import { Vault } from '../vault';
import {
  ICreateTransactionPayload,
  IPredicatePayload,
  ISignTransaction,
  TransactionStatus,
} from '../../api';

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

  async savePredicate(vault: Vault) {
    const payload: IPredicatePayload = {
      name: vault.address.toB256(),
      predicateAddress: vault.address.toB256(),
      minSigners: vault.configurable.SIGNATURES_COUNT,
      addresses: vault.configurable.SIGNERS,
      configurable: JSON.stringify(vault.configurable),
      provider: this.url,
    };

    const predicate = await this.service.createPredicate(payload);

    return predicate;
  }

  async findPredicateByAddress(address: string) {
    return await this.service.findByAddress(address);
  }

  async saveTransaction(
    tx: ScriptTransactionRequest | CreateTransactionRequest,
    predicate: string,
  ) {
    const payload: ICreateTransactionPayload = {
      name: 'randomname',
      predicateAddress: predicate,
      hash: tx.getTransactionId(this.getChainId()).slice(2),
      txData: tx,
      status: TransactionStatus.AWAIT_REQUIREMENTS, // todo: not send, just add on api create
    };
    const transaction = await this.service.createTransaction(payload);

    return transaction;
  }

  async findTransaction(identifier: string, vault: Vault) {
    const transaction = await this.service.findTransactionByHash(identifier);

    return vault.BakoTransfer(transaction.txData);
  }

  async signTransaction(params: ISignTransaction) {
    const { hash, signature, approve, vault } = params;
    const transaction = await this.service.signTransaction({
      hash,
      signature,
      approve: approve ?? true,
    });

    return vault.signTransaction(transaction.txData);
  }

  async send(hash: string) {
    await this.service.sendTransaction(hash);

    return new TransactionResponse(hash, this);
  }
}
