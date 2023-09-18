import { Address, InputType, Provider, ScriptTransactionRequest, TransactionRequestLike, TransactionResponse, arrayify, bn, hashTransaction, hexlify, transactionRequestify } from 'fuels';
import { Asset } from '../assets';
import { IAssetGroupById, ITransferAsset } from '../assets/types';
import { Vault } from '../predicates';
import { transactionScript } from './helpers';
import { IPayloadTransfer, ITransfer } from './types';

/**
 * `Transfer` are extension of ScriptTransactionRequest, to create and send transactions
 */
export class Transfer extends ScriptTransactionRequest implements ITransfer {
    private vault: Vault;
    private chainId: number;
    private network: string;

    private assets: ITransferAsset[];
    /**
     * Creates an instance of the Transfer class.
     *
     * @param vault - Vault to which this transaction belongs
     * @param assets - Asset output of transaction
     * @param witnesses - Signatures on the hash of this transaction, signed by the vault subscribers
     */
    constructor({ vault, assets, witnesses }: IPayloadTransfer) {
        super({
            gasPrice: bn(1),
            gasLimit: bn(100000),
            script: transactionScript
        });

        const _configurable = vault.getConfigurable();
        this.chainId = _configurable.chainId;
        this.network = _configurable.network;
        this.witnesses = witnesses;
        this.assets = assets;
        this.vault = vault;
    }

    /**
     * Configure outputs and parameters of transaction instance.
     *
     * @returns this transaction configured and your hash
     */
    public async instanceTransaction() {
        const outputs = await Asset.assetsGroupByTo(this.assets);
        const coins = await Asset.assetsGroupById(this.assets);
        const transactionCoins = await Asset.addTransactionFee(coins, this.gasPrice);
        const vault = this.vault;

        Object.entries(outputs).map(([, value]) => {
            this.addCoinOutput(Address.fromString(value.to), value.amount, value.assetId);
        });

        await this.validtateBalance(coins);
        const _coins = await vault.getResourcesToSpend(transactionCoins);

        this.addResources(_coins);

        this.inputs?.forEach((input) => {
            if (input.type === InputType.Coin && hexlify(input.owner) === vault.address.toB256()) {
                input.predicate = arrayify(vault.bytes);
                input.predicateData = arrayify(vault.predicateData);
            }
        });
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
    public async sendTransaction() {
        const provider = new Provider(this.network);
        const _transaction = transactionRequestify(this);
        const tx_est = await provider.estimatePredicates(_transaction);

        const encodedTransaction = hexlify(tx_est.toTransactionBytes());

        const {
            submit: { id: transactionId }
        } = await provider.operations.submit({ encodedTransaction });

        const sender = new TransactionResponse(transactionId, provider);

        const result = await sender.waitForResult();

        return {
            status: result.status,
            gasUsed: result.gasUsed.format(),
            block: this.makeBlockUrl(result.id)
        };
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
    private makeBlockUrl(block: string | undefined) {
        return block ? `https://fuellabs.github.io/block-explorer-v2/transaction/${block}?providerUrl=${encodeURIComponent(this.network)}` : '';
    }

    /**
     * Generates and formats the transaction hash
     *
     * @returns hash of this transaction
     */
    public getHashTxId() {
        const hash = hashTransaction(transactionRequestify(this), this.chainId);
        return hash.slice(2);
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
