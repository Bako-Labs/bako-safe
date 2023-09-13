import { Predicate } from 'fuels';
import { ITransferAsset } from '../assets';
import { IPayloadTransfer, Transfer, predicateABI, predicateBIN } from '../index';
import { makeHashPredicate, makeSubscribers } from './helpers';
import { IConfVault, IConfigurable, IPayloadVault, IVault, IVaultTransfer } from './types';
export * from './types';

export class Vault extends Predicate<[]> implements IVault {
    private bin: string;
    private abi: { [name: string]: unknown };
    private network: string;
    private configurable: IConfigurable;
    private transactions: IVaultTransfer[] = [];

    constructor({ configurable, abi, bytecode }: IPayloadVault) {
        const _abi = abi ? JSON.parse(abi) : predicateABI;
        const _bin = bytecode ? bytecode : predicateBIN;
        const _network = configurable.network; //todo: move to dynamic

        //validations
        Vault.validations(configurable);

        //make predicate
        const _configurable = Vault.makePredicate(configurable, JSON.stringify(_abi));

        super(_bin, _abi, _network, _configurable);

        this.bin = _bin;
        this.network = _network;
        this.abi = _abi;
        this.configurable = this.configurable = {
            HASH_PREDUCATE: _configurable.HASH_PREDUCATE as number[],
            SIGNATURES_COUNT: _configurable.SIGNATURES_COUNT as string,
            SIGNERS: _configurable.SIGNERS as string[]
        };
    }

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

    private static makePredicate(configurable: IConfVault, abi: string) {
        const hasExists = configurable.HASH_PREDUCATE;
        const _configurable: { [name: string]: unknown } = {
            SIGNATURES_COUNT: configurable.SIGNATURES_COUNT,
            SIGNERS: makeSubscribers(configurable.SIGNERS),
            HASH_PREDUCATE: hasExists ? configurable.HASH_PREDUCATE : makeHashPredicate()
        };

        return _configurable;
    }

    public async includeTransaction(assets: ITransferAsset[], witnesses: string[]) {
        const payload: IPayloadTransfer = {
            vault: this,
            assets: assets,
            witnesses: witnesses
        };
        const _transfer = new Transfer(payload);
        await _transfer.instanceTransaction();

        const transfer: IVaultTransfer = {
            hash: makeHashPredicate().join(''),
            transaction: _transfer
        };
        this.transactions.push(transfer);

        return transfer;
    }

    public findTransactions(hash: string) {
        return this.transactions.find((transaction) => transaction.hash === hash);
    }

    public getTransactions() {
        return this.transactions;
    }

    public getAbi() {
        return this.abi;
    }

    public getBin() {
        return this.bin;
    }

    public getConfigurable() {
        return this.configurable;
    }

    public getNetwork() {
        return this.network;
    }
}
