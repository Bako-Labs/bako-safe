import { Address, InputType, Provider, ScriptTransactionRequest, TransactionResponse, arrayify, bn, hashTransaction, hexlify, transactionRequestify } from 'fuels';
import { Asset } from '../assets';
import { IAssetGroupById, ITransferAsset } from '../assets/types';
import { Vault } from '../predicates';
import { transactionScript } from './helpers';
import { IPayloadTransfer, ITransfer } from './types';

export class Transfer extends ScriptTransactionRequest implements ITransfer {
    //private transaction: TransactionRequest;
    private hashTxId!: string;
    private vault: Vault;

    private assets: ITransferAsset[];
    //private witnesses: string[];
    //private signers: string[];

    constructor({ vault, assets, witnesses }: IPayloadTransfer) {
        super({
            gasPrice: bn(1),
            gasLimit: bn(100000),
            script: transactionScript
        });
        this.witnesses = witnesses;
        this.assets = assets;
        this.vault = vault;
    }
    setWitnesses(witnesses: string[]): string[] {
        throw new Error('Method not implemented.');
    }

    public async instanceTransaction() {
        const outputs = await Asset.assetsGroupByTo(this.assets);
        const coins = await Asset.assetsGroupById(this.assets);
        const transactionCoins = await Asset.addTransactionFee(coins, this.gasPrice);
        const vault = this.vault;

        Object.entries(outputs).map(([key, value]) => {
            this.addCoinOutput(Address.fromString(value.to), value.amount, value.assetId);
        });

        //todo: verify requiriments
        await this.validtateBalance(coins);
        const _coins = await vault.getResourcesToSpend(transactionCoins);

        this.addResources(_coins);

        // Add predicate data to the input
        this.inputs?.forEach((input) => {
            if (input.type === InputType.Coin && hexlify(input.owner) === vault.address.toB256()) {
                input.predicate = arrayify(vault.bytes);
                input.predicateData = arrayify(vault.predicateData);
            }
        });

        // Request signature
        const txData = transactionRequestify(this);
        const txhash = hashTransaction(txData);
        const hash = txhash.slice(2);

        this.hashTxId = hash;

        return { txData, hash };
    }

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

    public async sendTransaction() {
        const provider = new Provider(this.vault.getNetwork());

        const encodedTransaction = hexlify(this.toTransactionBytes());

        const {
            submit: { id: transactionId }
        } = await provider.operations.submit({ encodedTransaction });
        this.hashTxId = transactionId.slice();

        const sender = new TransactionResponse(transactionId, provider);

        const result = await sender.waitForResult();

        return {
            status: result.status.type,
            block: this.makeBlockUrl(),
            gasUsed: result.gasUsed.format(),
            transactionResume: '' //JSON.stringify(result)
        };
    }

    private makeBlockUrl() {
        return `https://fuellabs.github.io/block-explorer-v2/transaction/${this.hashTxId}?providerUrl=${encodeURIComponent(this.vault.getNetwork())}`;
    }

    public getHashTxId() {
        const hash = hashTransaction(transactionRequestify(this));
        return hash.slice(2);
    }

    public getTransaction() {
        return this;
    }

    public getAssets() {
        return this.assets;
    }
}
