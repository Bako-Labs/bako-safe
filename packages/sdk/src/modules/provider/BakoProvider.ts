import {
  Provider,
  TransactionResponse,
  TransactionRequest,
  randomUUID,
  transactionRequestify,
} from 'fuels';

import {
  Service,
  ICreateTransactionPayload,
  IPredicatePayload,
  ISignTransaction,
  TransactionStatus,
  CLIAuth,
} from '../service';

import {
  TypeUser,
  BakoProviderSetup,
  BakoProviderOptions,
  BakoProviderAuthOptions,
  BakoProviderAPITokenOptions,
} from './types';

import { Vault } from '../vault';

/**
 * BakoProvider class extends the Provider (FuelProvider) class to include additional
 * functionalities such as authentication, transaction management, and
 * predicate handling.
 */
export class BakoProvider extends Provider {
  public options: BakoProviderOptions;
  public service: Service;
  public cliAuth?: CLIAuth;

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
      serverApi: this.options.serverApi,
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
    options: BakoProviderOptions | BakoProviderAPITokenOptions,
  ): Promise<BakoProvider> {
    if ('apiToken' in options && options.apiToken) {
      const { apiToken, ...rest } = options;
      const providerFuel = new Provider(url);
      const chainId = await providerFuel.getChainId();
      const cliAuth = await Service.cliAuth({
        network: {
          url: providerFuel.url,
          chainId: chainId,
        },
        token: options.apiToken,
        serverApi: options.serverApi,
      });
      const provider = new BakoProvider(url, {
        ...rest,
        token: cliAuth.code,
        address: cliAuth.address,
      });
      provider.cliAuth = cliAuth;
      return provider;
    }

    const provider = new BakoProvider(url, options as BakoProviderOptions);
    await provider.fetchChainAndNodeInfo();
    return provider;
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
    const { user, rootWallet } = await Service.sign({
      digest: options.challenge,
      encoder: options.encoder ?? TypeUser.FUEL,
      signature: options.token,
      userAddress: options.address,
    });
    return BakoProvider.create(url, {
      ...options,
      userId: user,
      rootWallet,
    });
  }

  /**
   * Saves a predicate to the service based on the provided vault data.
   *
   * @param vault The Vault instance containing necessary configuration.
   * @returns The created predicate.
   */
  async savePredicate(
    vault: Vault & {
      name?: string;
      description?: string;
    },
  ) {
    const payload: IPredicatePayload = {
      name: vault.name ?? vault.address.toB256(),
      predicateAddress: vault.address.toB256(),
      configurable: JSON.stringify(vault.configurable),
      provider: this.url,
      version: vault.predicateVersion,
      description: vault.description,
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
   * @param request The transaction request, either ScriptTransaction or CreateTransaction.
   * @param transaction The address of the predicate for the transaction.
   * @returns The created transaction.
   */
  async saveTransaction(
    request: TransactionRequest,
    transaction: Pick<ICreateTransactionPayload, 'name' | 'predicateAddress'>,
  ) {
    const chainId = await this.getChainId();
    const payload: ICreateTransactionPayload = {
      name: transaction.name ?? `vault ${randomUUID()}`,
      predicateAddress: transaction.predicateAddress,
      hash: request.getTransactionId(chainId).slice(2),
      txData: request,
      status: TransactionStatus.AWAIT_REQUIREMENTS,
    };
    return this.service.createTransaction(payload);
  }

  /**
   * Finds a transaction by its hash and processes it using a vault.
   *
   * @param hash The transaction hash to find.
   * @returns The processed transaction.
   */
  async findTransaction(hash: string) {
    const transaction = await this.service.findTransactionByHash(hash);

    return transactionRequestify(transaction.txData);
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
    const chainId = await this.getChainId();
    return new TransactionResponse(hash, this, chainId);
  }

  async connectDapp(sessionId: string) {
    return await this.service.createDapp({
      sessionId,
      userAddress: this.options.address,
      vaultId: this.options.rootWallet ?? randomUUID(),
      origin: window?.origin ?? 'not found',
      request_id: randomUUID(),
    });
  }

  async disconnect(sessionId: string) {
    return await this.service.disconnectDapp(sessionId);
  }

  async wallet() {
    const info = await this.service.userWallet();
    return new Vault(this, JSON.parse(info.configurable), info.version);
  }
}
