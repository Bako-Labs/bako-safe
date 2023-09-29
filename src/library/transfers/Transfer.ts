import { Address, InputType, ScriptTransactionRequest, TransactionRequestLike, arrayify, bn, hashTransaction, hexlify, transactionRequestify } from 'fuels';
import { ICreateTransactionPayload, ITransactionService, TransactionService, TransactionStatus } from '../api/transactions';
import { Asset } from '../assets';
import { IAssetGroupById, IAssetTransaction } from '../assets/types';
import { Vault } from '../predicates';
import { delay } from '../utils';
import { transactionScript } from './helpers';
import { IPayloadTransfer, ITransfer } from './types';
/**
 * `Transfer` are extension of ScriptTransactionRequest, to create and send transactions
 */
export class Transfer extends ScriptTransactionRequest implements ITransfer {
    private vault!: Vault;
    private chainId!: number;
    //private network!: string;
    public BSAFETransactionId!: string;
    private assets!: IAssetTransaction[];
    private service: ITransactionService;
    private sendingProcess: boolean = false;
    /**
     * Creates an instance of the Transfer class.
     *
     * @param vault - Vault to which this transaction belongs
     * @param assets - Asset output of transaction
     * @param witnesses - Signatures on the hash of this transaction, signed by the vault subscribers
     */
    constructor(vault: Vault) {
        super({
            gasPrice: bn(1_000_000),
            gasLimit: bn(100000),
            script: transactionScript
        });
        this.vault = vault;
        this.service = new TransactionService();

        const _configurable = this.vault.getConfigurable();
        this.chainId = _configurable.chainId;
        //this.network = _configurable.network;
    }

    public async instanceTransaction(params: IPayloadTransfer | string) {
        if (typeof params === 'string') {
            // find on API
            this.BSAFETransactionId = params;
            await this.instanceOldTransaction();
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
        const transactionCoins = await Asset.addTransactionFee(coins, this.gasPrice);

        Object.entries(outputs).map(([, value]) => {
            this.addCoinOutput(Address.fromString(value.to), value.amount, value.assetId);
        });

        await this.validtateBalance(coins);
        const _coins = await this.vault.getResourcesToSpend(transactionCoins);

        this.addResources(_coins);
        this.assets = _coins.length > 0 ? Asset.includeSpecificAmount(_coins, assets) : [];

        this.inputs?.forEach((input) => {
            if (input.type === InputType.Coin && hexlify(input.owner) === this.vault.address.toB256()) {
                input.predicate = arrayify(this.vault.bytes);
                input.predicateData = arrayify(this.vault.predicateData);
            }
        });

        this.witnesses = witnesses;
        !this.BSAFETransactionId && (await this.createTransaction());
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
                this.sendingProcess = true;
                await this.service.send(this.BSAFETransactionId);
                this.sendingProcess = false;
                break;

            case TransactionStatus.AWAIT_REQUIREMENTS || TransactionStatus.SUCCESS:
                this.sendingProcess = false;
                break;
        }
        return {
            ...JSON.parse(transaction.resume),
            bsafeID: transaction.id
        };
    }

    public async wait() {
        const transaction = await this.service.findByTransactionID(this.BSAFETransactionId);
        switch (transaction.status) {
            case TransactionStatus.PENDING_SENDER: // send transaction
                if (!this.sendingProcess) return await this.send();
                break;

            case TransactionStatus.AWAIT_REQUIREMENTS: //call this recursive function
                await delay(1000);
                this.wait();
                break;

            case TransactionStatus.SUCCESS:
                this.sendingProcess = false;
                break;

            default:
                break;
        }

        return (
            transaction?.resume && {
                ...JSON.parse(transaction.resume),
                bsafeID: transaction.id
            }
        );
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
        const txHash = hashTransaction(transactionRequestify(this), this.chainId);
        return txHash.slice(2);
    }

    /**
     * Encapsulation of this transaction
     *
     * @returns this transaction
     */
    public getTransaction() {
        return this;
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
