import { Predicate, Provider } from 'fuels';

import { IListTransactions, IPredicateService } from '../api/predicates';
import { PredicateService } from '../api/predicates/predicate';
import { IPayloadTransfer, Transfer, predicateABI, predicateBIN } from '../index';
import { makeHashPredicate, makeSubscribers } from './helpers';
import { IConfVault, IPayloadVault, IVault } from './types';
import { IBSAFEAuth } from '../api/auth';
import { defaultConfigurable } from '../configurables';
import { v4 as uuidv4 } from 'uuid';

/**
 * `Vault` are extension of predicates, to manager transactions, and sends.
 */

export class Vault extends Predicate<[]> implements IVault {
    private bin: string;
    public BSAFEVaultId!: string;
    private configurable: IConfVault;
    private abi: { [name: string]: unknown };
    private transactions: { [id: string]: Transfer } = {};
    private api!: IPredicateService;
    private auth!: IBSAFEAuth;

    public transactionRecursiveTimeout: number;
    public name!: string;
    public description?: string;
    /**
     * Creates an instance of the Predicate class.
     *
     * @param configurable - The parameters of signature requirements.
     *      @param HASH_PREDUCATE - Hash to works an unic predicate, is not required, but to instance old predicate is an number array
     *      @param SIGNATURES_COUNT - Number of signatures required of predicate
     *      @param SIGNERS - Array string of predicate signers
     * @param abi - The JSON abi to BSAFE multisig.
     * @param bytecode - The binary code of preficate BSAFE multisig.
     * @param transactionRecursiveTimeout - The time to refetch transaction on BSAFE API.
     * @param BSAFEAuth - The auth to BSAFE API.
     **/

    constructor({ configurable, abi, bytecode, transactionRecursiveTimeout, BSAFEAuth, name, description }: IPayloadVault) {
        const _abi = abi ? JSON.parse(abi) : predicateABI;
        const _bin = bytecode ? bytecode : predicateBIN;
        const _network = configurable.network;
        const _chainId = configurable.chainId;
        Vault.validations(configurable);

        const _configurable = Vault.makePredicate(configurable);
        const provider = new Provider(_network);

        super(_bin, _chainId, _abi, provider, _configurable);

        this.bin = _bin;
        this.abi = _abi;
        this.configurable = this.configurable = {
            HASH_PREDUCATE: _configurable.HASH_PREDUCATE as number[],
            SIGNATURES_COUNT: _configurable.SIGNATURES_COUNT as number,
            SIGNERS: _configurable.SIGNERS as string[],
            network: _network,
            chainId: _chainId
        };
        this.name = name ? name : `Random Vault Name - ${uuidv4()}`;
        this.description = description ? description : undefined;

        this.transactionRecursiveTimeout = transactionRecursiveTimeout ? transactionRecursiveTimeout : defaultConfigurable['refetchTimeout'];

        if (BSAFEAuth) {
            const _auth = BSAFEAuth;
            this.auth = _auth;
            this.api = new PredicateService(_auth);
            if (this.configurable.HASH_PREDUCATE) {
                this.BSAFEVaultId = this.configurable.HASH_PREDUCATE.join('');
            }
            this.create();
        }
    }

    /**
     *
     * Validate creation parameters.
     *
     * @param configurable - The parameters of signature requirements.
     * @returns thire is no return, but if an error is detected it is trigged
     */
    private static validations(configurable: IConfVault) {
        const { SIGNATURES_COUNT, SIGNERS } = configurable;
        if (!SIGNATURES_COUNT || Number(SIGNATURES_COUNT) == 0) {
            throw new Error('SIGNATURES_COUNT is required must be granter than zero');
        }
        if (!SIGNERS || SIGNERS.length === 0) {
            throw new Error('SIGNERS must be greater than zero');
        }
        if (SIGNERS.length < Number(SIGNATURES_COUNT)) {
            throw new Error('Required Signers must be less than signers');
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
     *
     * @returns if auth is not defined, throw an error
     */
    private async create() {
        this.verifyAuth();
        const { id } = await this.api.create({
            name: this.name,
            description: this.description,
            predicateAddress: this.address.toString(),
            minSigners: this.configurable.SIGNATURES_COUNT,
            addresses: this.configurable.SIGNERS,
            owner: this.address.toString(),
            bytes: this.bin,
            abi: JSON.stringify(this.abi),
            configurable: JSON.stringify(this.configurable),
            provider: this.provider.url
        });
        this.BSAFEVaultId = id;
    }

    /**
     * Make configurable of predicate
     *
     * @param configurable - The parameters of signature requirements.
     * @returns an formatted object to instance a new predicate
     */
    private static makePredicate(configurable: IConfVault) {
        const hasExists = configurable.HASH_PREDUCATE;
        const _configurable: { [name: string]: unknown } = {
            SIGNATURES_COUNT: configurable.SIGNATURES_COUNT,
            SIGNERS: makeSubscribers(configurable.SIGNERS),
            HASH_PREDUCATE: hasExists ? configurable.HASH_PREDUCATE : makeHashPredicate()
        };

        return _configurable;
    }

    /**
     * Include new transaction to vault
     *
     * @param assets - Output assets of transaction
     * @param witnesses - witnesses of predicate [transaction id signed to address signer]
     * @returns return a new transaction and include in vault states
     */

    public async BSAFEIncludeTransaction(params: IPayloadTransfer | string) {
        const _transfer = new Transfer(this, this.auth);
        await _transfer.instanceTransaction(params);

        return _transfer;
    }

    /**
     * Return an specific transaction of list
     *
     * @param hash - key of specific transaction of object
     * @returns an transaction
     */
    public findTransactions(hash: string) {
        return this.transactions[hash];
    }

    /**
     * Return an list of transaction of this vault
     *
     * @returns an transaction list
     */
    public async getTransactions(params?: IListTransactions) {
        this.verifyAuth();
        return await this.api.listPredicateTransactions({
            predicateId: [this.BSAFEVaultId],
            ...params
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
