import { arrayify, Predicate } from 'fuels';

import {
  defaultListParams,
  IBSAFEAuth,
  IListTransactions,
  IPredicate,
  IPredicateService,
} from '../api';
import {
  ECreationtype,
  IBSAFEApi,
  IBSAFEIncludeTransaction,
  IConfVault,
  IPayloadVault,
  IVault,
} from './types';
import {
  identifyCreateVaultParams,
  makeHashPredicate,
  makeSubscribers,
} from './helpers';
import { Transfer } from '../transfers';
import { v4 as uuidv4 } from 'uuid';
import { AddressUtils } from '../address/Address';
import { PredicateAbi__factory } from '../predicates';

/**
 * `Vault` are extension of predicates, to manager transactions, and sends.
 */
export class Vault extends Predicate<[]> implements IVault {
  // private readonly RECURSIVE_TIMEOUT = 10000;

  private bin: string;
  private abi: { [name: string]: unknown };
  private api!: IPredicateService;
  private auth!: IBSAFEAuth;
  private configurable: IConfVault;

  public name!: string;
  //@ts-ignore
  public BSAFEVault!: IPredicate;
  public BSAFEVaultId!: string;
  public description?: string;
  public transactionRecursiveTimeout: number;

  protected constructor({
    configurable,
    provider,
    abi = PredicateAbi__factory.abi as unknown as string,
    bytecode = PredicateAbi__factory.bin,
    name,
    description,
    BSAFEVaultId,
    BSAFEVault,
    BSAFEAuth,
    transactionRecursiveTimeout = 1000,
    api,
  }: IPayloadVault) {
    const _abi = typeof abi === 'string' ? JSON.parse(abi) : abi;
    const _bin = bytecode;

    const { network: _network, chainId: _chainId } = configurable;
    const _configurable = Vault.makePredicate(configurable);
    super(arrayify(_bin), provider, _abi, _configurable);

    this.bin = _bin;
    this.abi = _abi;
    this.configurable = {
      HASH_PREDICATE: _configurable.HASH_PREDICATE as number[],
      SIGNATURES_COUNT: _configurable.SIGNATURES_COUNT as number,
      SIGNERS: _configurable.SIGNERS as string[],
      network: _network,
      chainId: _chainId,
    };
    this.provider = provider;
    this.name = name || `Vault - ${uuidv4()}`;
    this.description = description;
    this.BSAFEVaultId = BSAFEVaultId!;
    this.transactionRecursiveTimeout = transactionRecursiveTimeout;
    this.BSAFEVault = BSAFEVault!;
    this.auth = BSAFEAuth!;
    this.api = api!;
  }

  /**
   * Creates an instance of the Predicate class.
   *
   * @param configurable - The parameters of signature requirements.
   *      @param HASH_PREDICATE - Hash to works an unic predicate, is not required, but to instance old predicate is an number array
   *      @param SIGNATURES_COUNT - Number of signatures required of predicate
   *      @param SIGNERS - Array string of predicate signers
   * @param abi - The JSON abi to BSAFE multisig.
   * @param bytecode - The binary code of preficate BSAFE multisig.
   * @param transactionRecursiveTimeout - The time to refetch transaction on BSAFE API.
   * @param BSAFEAuth - The auth to BSAFE API.
   *
   * @returns an instance of Vault
   **/
  static async create(params: IPayloadVault | IBSAFEApi) {
    const _params = await identifyCreateVaultParams(params);

    switch (_params.type) {
      case ECreationtype.IS_OLD:
        return new Vault(_params.payload);
      case ECreationtype.IS_NEW:
        const vault = new Vault(_params.payload);
        !!vault.api && (await vault.createOnService());
        return vault;
      default:
        throw new Error('Invalid param type to create a vault');
    }
  }

  /**
   * To use bsafe API, auth is required
   *
   * @returns if auth is not defined, throw an error
   */
  private verifyAuth() {
    if (!this.auth) {
      throw new Error('Auth is required');
    }
  }

  /**
   * Send a caller to BSAFE API to save predicate
   * Set BSAFEVaultId and BSAFEVault
   *
   *
   * @returns if auth is not defined, throw an error
   */
  private async createOnService() {
    this.verifyAuth();
    const { id, ...rest } = await this.api.create({
      name: this.name,
      description: this.description,
      predicateAddress: this.address.toString(),
      minSigners: this.configurable.SIGNATURES_COUNT,
      addresses: AddressUtils.hex2string(this.configurable.SIGNERS),
      bytes: this.bin,
      abi: JSON.stringify(this.abi),
      configurable: JSON.stringify(this.configurable),
      provider: this.provider.url,
    });
    this.BSAFEVault = {
      ...rest,
      id,
    };
    this.BSAFEVaultId = id;
  }

  /**
   * Make configurable of predicate
   *
   * @param {IConfVault} configurable - The parameters of signature requirements.
   * @returns an formatted object to instance a new predicate
   */
  private static makePredicate(configurable: IConfVault) {
    const _configurable: { [name: string]: unknown } = {
      SIGNATURES_COUNT: configurable.SIGNATURES_COUNT,
      SIGNERS: makeSubscribers(configurable.SIGNERS),
      HASH_PREDICATE: configurable.HASH_PREDICATE ?? makeHashPredicate(),
    };

    return _configurable;
  }

  /**
   * Include new transaction to vault
   *
   * @param {IFormatTransfer} param - IFormatTransaction or TransactionRequestLike
   * @param {TransactionRequestLike} param - IFormatTransaction or TransactionRequestLike
   * @returns return a new Transfer instance
   */
  public async BSAFEIncludeTransaction(param: IBSAFEIncludeTransaction) {
    return Transfer.instance({
      auth: this.auth,
      vault: this,
      transfer: param,
      isSave: true,
    });
  }

  /**
   * Return an list of transaction of this vault
   *
   *
   * @param {IListTransactions} params - The params to list transactions
   *  - has optional params
   *  - by default, it returns the first 10 transactions
   *
   *
   * @returns {Promise<IPagination<IBSAFEGetTransactions>>} an transaction paginated transaction list
   *
   *
   */
  public async BSAFEGetTransactions(params?: IListTransactions) {
    this.verifyAuth();

    const tx = await this.api
      .listPredicateTransactions({
        predicateId: [this.BSAFEVaultId],
        ...(params ?? defaultListParams),
      })
      .then((data) => {
        return {
          ...data,
          data: data.data.map((tx) => {
            return {
              resume: tx.resume,
              witnesses: tx.witnesses,
            };
          }),
        };
      });

    return tx;
  }

  /**
   * Return an list of transaction of this vault
   * @param transactionId - The transaction id on BSAFEApi
   *
   * @returns an transaction list
   *
   *
   */
  public async BSAFEGetTransaction(transactionId: string) {
    return Transfer.instance({
      vault: this,
      auth: this.auth,
      transfer: transactionId,
    });
  }

  /**
   * Return abi of this vault
   *
   * @returns an abi
   */
  public getAbi() {
    return this.abi;
  }

  /**
   * Return binary of this vault
   *
   * @returns an binary
   */
  public getBin() {
    return this.bin;
  }

  /**
   * Return this vault configurables state
   *
   * @returns configurables [signers, signers requested, hash]
   */
  public getConfigurable() {
    return this.configurable;
  }
}
