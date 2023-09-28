import { Predicate, Provider } from 'fuels';
import { ITransferAsset } from '../assets';
import { IPayloadTransfer, Transfer, predicateABI, predicateBIN } from '../index';
import { makeHashPredicate, makeSubscribers } from './helpers';
import { IConfVault, IPayloadVault, IVault } from './types';
export * from './types';

/**
 * `Vault` are extension of predicates, to manager transactions, and sends.
 */

export class Vault extends Predicate<[]> implements IVault {
    private bin: string;
    private abi: { [name: string]: unknown };
    private configurable: IConfVault;
    private transactions: { [id: string]: Transfer } = {};

    /**
     * Creates an instance of the Predicate class.
     *
     * @param configurable - The parameters of signature requirements.
     *      @param HASH_PREDUCATE - Hash to works an unic predicate, is not required, but to instance old predicate is an number array
     *      @param SIGNATURES_COUNT - Number of signatures required of predicate
     *      @param SIGNERS - Array string of predicate signers
     * @param abi - The JSON abi to BSAFE multisig.
     * @param bytecode - The binary code of preficate BSAFE multisig.
     */

    constructor({ configurable, abi, bytecode }: IPayloadVault) {
        const _abi = abi ? JSON.parse(abi) : predicateABI;
        const _bin = bytecode ? bytecode : predicateBIN;
        const _network = configurable.network; //todo: move to dynamic
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
    public async includeTransaction(assets: ITransferAsset[], witnesses: string[]) {
        const payload: IPayloadTransfer = {
            vault: this,
            assets: assets,
            witnesses: witnesses
        };
        const _transfer = new Transfer(payload);
        await _transfer.instanceTransaction();
        const _id = makeHashPredicate().join('');

        this.transactions[_id] = _transfer;

        return this.transactions[_id];
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
    public getTransactions() {
        return Object.entries(this.transactions).map(([, value]) => {
            return value;
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
