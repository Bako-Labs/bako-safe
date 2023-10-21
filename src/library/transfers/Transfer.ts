import { ScriptTransactionRequest, TransactionRequestLike, bn, hashTransaction, transactionRequestify } from 'fuels';
import { ICreateTransactionPayload, ITransaction, ITransactionService, TransactionService, TransactionStatus } from '../api/transactions';
import { Asset } from '../assets';
import { IAssetGroupById, IAssetTransaction } from '../assets/types';
import { Vault } from '../predicates';
import { delay } from '../utils';
import { IPayloadTransfer, ITransfer } from './types';
import { IBSAFEAuth } from '../api/auth';
import { BSAFEScriptTransaction } from './ScriptTransaction';
import { defaultConfigurable } from '../configurables';
import { ITransactionResume } from '../api/transactions/types';
/**
 * `Transfer` are extension of ScriptTransactionRequest, to create and send transactions
 */
export class Transfer implements ITransfer {
    private vault!: Vault;
    private chainId!: number;
    //private network!: string;
    private assets!: IAssetTransaction[];
    private service!: ITransactionService;
    public BSAFETransactionId!: string;
    public BSAFEScript!: ScriptTransactionRequest;
    /**
     * Creates an instance of the Transfer class.
     *
     * @param vault - Vault to which this transaction belongs
     * @param assets - Asset output of transaction
     * @param witnesses - Signatures on the hash of this transaction, signed by the vault subscribers
     */
    constructor(vault: Vault, auth?: IBSAFEAuth) {
        this.vault = vault;
        if (auth) {
            this.service = new TransactionService(auth);
        }

        const _configurable = this.vault.getConfigurable();
        this.chainId = _configurable.chainId;
        //this.network = _configurable.network;
    }

    public async instanceTransaction(params: IPayloadTransfer | ITransaction | string) {
        if (typeof params === 'string') {
            // find on API
            this.BSAFETransactionId = params;
            await this.instanceOldTransaction();
        } else if ('id' in params && 'assets' in params && 'witnesses' in params) {
            const { witnesses, assets } = params;
            const _witnesses: string[] = [];
            witnesses.map((item) => {
                item.signature && _witnesses.push(item.signature);
            });

            await this.instanceNewTransaction({
                witnesses: _witnesses,
                assets: assets.map((assest) => {
                    return {
                        assetId: assest.assetId,
                        amount: assest.amount.toString(),
                        to: assest.to
                    };
                })
            });
        } else {
            // instance new transaction
            await this.instanceNewTransaction(params);
        }
    }

    /**
     * Configure outputs and parameters of transaction instance.
     *
     * @returns this transaction configured and your hash
     */
    public async instanceNewTransaction({ assets, witnesses }: IPayloadTransfer) {
        const outputs = await Asset.assetsGroupByTo(assets);
        const coins = await Asset.assetsGroupById(assets);
        const transactionCoins = await Asset.addTransactionFee(coins, defaultConfigurable['gasPrice']);

        await this.validtateBalance(coins);
        const _coins = await this.vault.getResourcesToSpend(transactionCoins);

        this.assets = _coins.length > 0 ? Asset.includeSpecificAmount(_coins, assets) : [];
        const script_t = new BSAFEScriptTransaction();
        await script_t.instanceTransaction(_coins, this.vault, outputs, witnesses);
        this.BSAFEScript = script_t;

        if (this.service) {
            !this.BSAFETransactionId && (await this.createTransaction());
        }
    }

    public async instanceOldTransaction() {
        const { witnesses, assets } = await this.service.findByTransactionID(this.BSAFETransactionId);
        const _witnesses: string[] = [];
        witnesses.map((item) => {
            item.signature && _witnesses.push(item.signature);
        });

        await this.instanceNewTransaction({
            witnesses: _witnesses,
            assets: assets.map((assest) => {
                return {
                    assetId: assest.assetId,
                    amount: assest.amount.toString(),
                    to: assest.to
                };
            })
        });
    }

    private async createTransaction() {
        const transaction: ICreateTransactionPayload = {
            predicateAddress: this.vault.address.toString(),
            name: 'transaction of ',
            hash: this.getHashTxId(),
            status: TransactionStatus.AWAIT_REQUIREMENTS,
            assets: this.assets
        };

        const result = await this.service.create(transaction);
        this.BSAFETransactionId = result.id;
    }

    /**
     * Validates all coins in the vault
     *
     * @param _coins - Vault to which this transaction belongs
     * @returns If one of the assets is not enough, an error will be returned
     */
    private async validtateBalance(_coins: IAssetGroupById) {
        const balances = await this.vault.getBalances();
        const coins = await Asset.assetsGroupById(
            balances.map((item) => {
                return {
                    assetId: item.assetId,
                    amount: item.amount.format(),
                    to: ''
                };
            })
        );
        Object.entries(_coins).map(([key, value]) => {
            if (bn(coins[key]).lt(value)) {
                throw new Error(`Insufficient balance for ${key}`);
            }
        });
    }

    /**
     * Send this transaction, update the tx_id, instantiate a transaction Response and wait for it to be processed
     *
     * @param _coins - Vault to which this transaction belongs
     * @returns sumary result of transaction
     */
    public async send() {
        const transaction = await this.service.findByTransactionID(this.BSAFETransactionId);
        switch (transaction.status) {
            case TransactionStatus.PENDING_SENDER:
                await this.service.send(this.BSAFETransactionId);
                break;

            case TransactionStatus.AWAIT_REQUIREMENTS || TransactionStatus.SUCCESS:
                break;
        }
        return {
            ...JSON.parse(transaction.resume),
            bsafeID: transaction.id
        };
    }

    public async wait() {
        let transaction = await this.service.findByTransactionID(this.BSAFETransactionId);
        while (transaction.status !== TransactionStatus.SUCCESS && transaction.status !== TransactionStatus.FAILED) {
            await delay(this.vault.transactionRecursiveTimeout); // todo: make time to dynamic
            transaction = await this.service.findByTransactionID(this.BSAFETransactionId);

            if (transaction.status == TransactionStatus.PENDING_SENDER) await this.send();

            if (transaction.status == TransactionStatus.PROCESS_ON_CHAIN) await this.service.verify(this.BSAFETransactionId);
        }

        const result: ITransactionResume = {
            ...JSON.parse(transaction.resume),
            status: transaction.status,
            bsafeID: transaction.id
        };
        return result;
    }

    hashTransaction(tx: TransactionRequestLike) {
        const txHash = hashTransaction(transactionRequestify(tx), this.chainId);
        return txHash.slice(2).toLowerCase();
    }
    /**
     * Create the url to consult the fuel block explorer
     *
     * @returns link of transaction block
     */
    // private makeBlockUrl(block: string | undefined) {
    //     return block ? `https://fuellabs.github.io/block-explorer-v2/transaction/${block}?providerUrl=${encodeURIComponent(this.network)}` : '';
    // }

    /**
     * Generates and formats the transaction hash
     *
     * @returns hash of this transaction
     */
    public getHashTxId() {
        const txHash = hashTransaction(transactionRequestify(this.BSAFEScript), this.chainId);
        return txHash.slice(2);
    }

    /**
     * Encapsulation of this transaction
     *
     * @returns this transaction
     */
    public getScript() {
        return this.BSAFEScript;
    }

    /**
     * Encapsulation of this transaction assets
     *
     * @returns this transaction assets
     */
    public getAssets() {
        return this.assets;
    }
}
