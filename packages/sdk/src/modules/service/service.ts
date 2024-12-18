import axios, { AxiosInstance } from 'axios';

import {
  UserCreate,
  defaultConfig,
  AuthRequestHeaders,
  ISignTransactionRequest,
  ICreateTransactionPayload,
  IPredicatePayload,
  AuthService,
  TokenResponse,
  PredicateResponse,
  SignService,
  CreateSessionResponse,
  TransactionBakoResponse,
  UserAuthResponse,
  CLIAuthPayload,
  CLIAuth,
} from './types';

// keep here to sync with the other files
export const api = axios.create({
  baseURL: defaultConfig.serverUrl,
});

/**
 * Service class for interacting with the Bako API.
 */
export class Service {
  private api: AxiosInstance;

  /**
   * Initializes the Service with authentication data.
   * @param {AuthService}       - The authentication data containing address and token.
   *  @param {string} address   - The address of the user.
   *  @param {string} token     - The token of the user.
   */
  constructor({ address, token, serverApi }: AuthService) {
    this.api = axios.create({
      ...api.defaults,
      baseURL: serverApi ?? defaultConfig.serverUrl,
    });

    if (address && token) {
      this.api.defaults.headers[AuthRequestHeaders.SIGNER_ADDRESS] = address;
      this.api.defaults.headers[AuthRequestHeaders.AUTHORIZATION] = token;
    }
  }

  /**
   * Fetches the list of workspaces associated with the current user.
   * @returns {Promise<[]>}    - The list of workspaces.
   */
  async getWorkspaces(): Promise<[]> {
    const { data } = await this.api.get('/workspace/by-user');
    return data;
  }

  /**
   * Fetches the latest tokens for the user.
   * @returns {Promise<TokenResponse>} - The user's latest tokens amount value.
   */
  async getToken(): Promise<TokenResponse> {
    const { data } = await this.api.get('/user/latest/tokens');
    return data;
  }

  /**
   * Creates a new predicate.
   * @param {IPredicatePayload} payload     - The payload for creating a predicate.
   * @returns {Promise<PredicateResponse>}  - The response containing predicate details.
   */
  async createPredicate(
    payload: IPredicatePayload,
  ): Promise<PredicateResponse> {
    const { provider, ...rest } = payload;
    const {
      data: { predicateAddress, configurable, version },
    } = await this.api.post('/predicate', rest);

    return {
      predicateAddress,
      configurable: JSON.parse(configurable),
      version,
    };
  }

  /**
   * Finds a predicate by its address.
   * @param {string} _predicateAddress      - The address of the predicate.
   * @returns {Promise<PredicateResponse>}  - The response containing predicate details.
   */
  async findByAddress(_predicateAddress: string): Promise<PredicateResponse> {
    const {
      data: { configurable, predicateAddress, version },
    } = await this.api.get(`/predicate/by-address/${_predicateAddress}`);

    return {
      configurable: JSON.parse(configurable),
      predicateAddress,
      version,
    };
  }

  /**
   * Fetches authentication information for the current user.
   * @returns {Promise<UserAuthResponse>}   - The user's authentication details.
   */
  async authInfo(): Promise<UserAuthResponse> {
    const { data } = await this.api.get('/user/latest/info');
    return data;
  }

  /**
   * Creates a new transaction.
   * @param {ICreateTransactionPayload} params  - The transaction payload.
   * @returns {Promise<boolean>}                - Whether the transaction was successfully created.
   */
  async createTransaction(params: ICreateTransactionPayload): Promise<boolean> {
    const { data } = await this.api.post('/transaction', params);
    return !!data;
  }

  /**
   * Finds a transaction by its hash.
   * @param {string} _hash - The hash of the transaction.
   * @returns {Promise<TransactionBakoResponse>} - The transaction response.
   */
  async findTransactionByHash(_hash: string): Promise<TransactionBakoResponse> {
    const hash = _hash.startsWith('0x') ? _hash : `0x${_hash}`;
    const {
      data: { txData },
    } = await this.api.get(`/transaction/by-hash/${hash}`);

    return {
      txData,
    };
  }

  /**
   * Signs a transaction.
   * @param {ISignTransactionRequest} params  - The sign transaction request payload.
   * @returns {Promise<boolean>}              - Whether the transaction was successfully signed.
   */
  public async signTransaction(
    params: ISignTransactionRequest,
  ): Promise<boolean> {
    const { hash, ...rest } = params;
    const { data } = await this.api.put(
      `/transaction/sign/${params.hash}`,
      rest,
    );

    return !!data;
  }

  /**
   * Sends a transaction.
   * @param {string} hash               - The hash of the transaction to be sent.
   * @returns {Promise<boolean>}        - Whether the transaction was successfully sent.
   */
  public async sendTransaction(hash: string): Promise<boolean> {
    const { data } = await this.api.post(`/transaction/send/${hash}`);

    return !!data;
  }

  /**
   * Creates a new user session.
   * @param {UserCreate} params                 - The user creation payload.
   * @returns {Promise<CreateSessionResponse>}  - The response containing the session code.
   */
  static async create(params: UserCreate): Promise<CreateSessionResponse> {
    const {
      data: { code },
    } = await api.post('/user', params);

    return { code };
  }

  /**
   * Signs in a user.
   * @param {SignService} params - The sign-in payload.
   * @returns {Promise<boolean>} - Whether the sign-in was successful.
   */
  static async sign(params: SignService): Promise<boolean> {
    const { data } = await api.post('/auth/sign-in', params);

    return !!data;
  }

  static async cliAuth(params: CLIAuthPayload): Promise<CLIAuth> {
    const { data } = await api.post<CLIAuth>('/cli/auth', params);

    return data;
  }
}
