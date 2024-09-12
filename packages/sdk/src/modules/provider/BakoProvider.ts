import { Provider, TransactionResponse, TransactionRequest } from 'fuels';

import {
  Service,
  ICreateTransactionPayload,
  IPredicatePayload,
  ISignTransaction,
  TransactionStatus,
} from '../service';

import {
  TypeUser,
  BakoProviderSetup,
  BakoProviderOptions,
  BakoProviderAuthOptions,
} from './types';

import { Vault } from '../vault';
import { randomBytes } from 'crypto';

/**
 * BakoProvider class extends the Provider (FuelProvider) class to include additional
 * functionalities such as authentication, transaction management, and
 * predicate handling.
 */
export class BakoProvider extends Provider {
  public options: BakoProviderOptions;
  public service: Service;

  /**
   * Protected constructor to initialize BakoProvider.
   *
   * @param url The URL of the provider.
   * @param options The options for the provider, including address and token.
   */
  protected constructor(url: string, options: BakoProviderOptions) {
    super(url, options);
    this.options = options as BakoProviderOptions;
    this.service = new Service({
      address: this.options.address,
      token: this.options.token,
    });
  }

  /**
   * Sets up a BakoProvider by generating a challenge for authentication.
   *
   * @param params Setup parameters including address, encoder, and provider.
   * @returns A challenge string for authentication.
   */
  static async setup(params: BakoProviderSetup) {
    const { address, encoder, provider, name } = params;

    const { code: challenge } = await Service.create({
      name: name ?? `from sdk - ${address}`,
      type: encoder ?? TypeUser.FUEL,
      address: address,
      provider,
    });

    return challenge;
  }

  /**
   * Static method to create a BakoProvider instance.
   *
   * @param url The URL of the provider.
   * @param options The same options for Provider, including address and token.
   * @returns A Promise that resolves to a BakoProvider instance.
   */
  static async create(
    url: string,
    options: BakoProviderOptions,
  ): Promise<BakoProvider> {
    return new BakoProvider(url, options);
  }

  /**
   * Static method to authenticate and create a BakoProvider instance.
   *
   * @param url The URL of the provider.
   * @param options The same options for Provider, including the auth options.
   * @returns A Promise that resolves to a BakoProvider instance.
   */
  static async authenticate(
    url: string,
    options: BakoProviderAuthOptions,
  ): Promise<BakoProvider> {
    await Service.sign({
      digest: options.challenge,
      encoder: options.encoder ?? TypeUser.FUEL,
      signature: options.token,
    });
    return new BakoProvider(url, options);
  }

  /**
   * Saves a predicate to the service based on the provided vault data.
   *
   * @param vault The Vault instance containing necessary configuration.
   * @returns The created predicate.
   */
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

  /**
   * Finds a predicate by its address.
   *
   * @param address The address of the predicate to find.
   * @returns The found predicate.
   */
  async findPredicateByAddress(address: string) {
    return await this.service.findByAddress(address);
  }

  /**
   * Saves a transaction associated with a specific predicate.
   *
   * @param tx The transaction request, either ScriptTransaction or CreateTransaction.
   * @param predicate The address of the predicate for the transaction.
   * @returns The created transaction.
   */
  async saveTransaction(tx: TransactionRequest, predicate: string) {
    const payload: ICreateTransactionPayload = {
      name: `vault ${randomBytes(16).toString('hex')}`,
      predicateAddress: predicate,
      hash: tx.getTransactionId(this.getChainId()).slice(2),
      txData: tx,
      status: TransactionStatus.AWAIT_REQUIREMENTS,
    };
    const transaction = await this.service.createTransaction(payload);

    return transaction;
  }

  /**
   * Finds a transaction by its hash and processes it using a vault.
   *
   * @param hash The transaction hash to find.
   * @param vault The vault instance to process the transaction.
   * @returns The processed transaction.
   */
  async findTransaction(hash: string, vault: Vault) {
    const transaction = await this.service.findTransactionByHash(hash);

    return vault.BakoTransfer(transaction.txData);
  }

  /**
   * Signs a transaction using the provided signature and approval status.
   *
   * @param params The signing parameters including hash, signature, and approval.
   * @returns The signed transaction.
   */
  async signTransaction(params: ISignTransaction) {
    const { hash, signature, approve } = params;
    const transaction = await this.service.signTransaction({
      hash,
      signature,
      approve: approve ?? true,
    });

    return transaction;
  }

  /**
   * Sends a transaction by its hash.
   *
   * @param hash The transaction hash to send.
   * @returns A TransactionResponse for the sent transaction.
   */
  async send(hash: string) {
    await this.service.sendTransaction(hash);

    return new TransactionResponse(hash, this);
  }
}
