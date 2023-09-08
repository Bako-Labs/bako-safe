import { Address, InputType, Provider, ScriptTransactionRequest, TransactionRequest, TransactionResponse, arrayify, bn, hashTransaction, hexlify, transactionRequestify } from 'fuels';
import { Asset } from '../assets';
import { ITransferAsset } from '../assets/types';
import { Vault } from '../predicates';
import { transactionScript, witnessesStatus } from './helpers';
import { IPayloadTransfer, IRequiredWitnesses, ITransfer } from './types';

export class Transfer extends Vault implements ITransfer {
    private transaction!: TransactionRequest;
    private hashTxId!: string;

    private assets: ITransferAsset[];
    private witnesses: string[];
    //private signers: string[];

    constructor({ vault, assets, witnesses }: IPayloadTransfer) {
        super(vault);

        this.witnesses = witnesses;
        this.assets = assets;
        this.transaction = new ScriptTransactionRequest({
            gasPrice: bn(1),
            gasLimit: bn(100000),
            script: transactionScript
        });
    }
    getWitnesses(): Promise<IRequiredWitnesses> {
        throw new Error('Method not implemented.');
    }

    public async instanceTransaction() {
        const outputs = await Asset.assetsGroupByTo(this.assets);
        const coins = await Asset.assetsGroupById(this.assets);
        const transactionCoins = await Asset.addTransactionFee(coins, this.transaction.gasPrice.toString());
        const vault = await this.getPredicate();

        Object.entries(outputs).map(([key, value]) => {
            this.transaction.addCoinOutput(Address.fromString(value.to), bn.parseUnits(value.amount.toString()), value.assetId);
        });

        //todo: verify requiriments
        const _coins = vault.getResourcesToSpend(transactionCoins);

        this.transaction.addResources(await _coins);

        // Add predicate data to the input
        this.transaction.inputs?.forEach((input) => {
            if (input.type === InputType.Coin && hexlify(input.owner) === vault.address.toB256()) {
                // eslint-disable-next-line no-param-reassign
                input.predicate = arrayify(vault.bytes);
                // eslint-disable-next-line no-param-reassign
                input.predicateData = arrayify(vault.predicateData);
            }
        });

        // Request signature
        const txData = transactionRequestify(this.transaction);
        const txhash = hashTransaction(txData);
        const hash = txhash.slice(2);

        this.transaction = txData;
        this.hashTxId = hash;

        return { txData, hash };
    }

    public async sendTransaction() {
        this.transaction.witnesses = this.witnesses;
        const provider = new Provider(this.getNetwork());

        const encodedTransaction = hexlify(this.transaction.toTransactionBytes());
        const {
            submit: { id: transactionId }
        } = await provider.operations.submit({ encodedTransaction });
        //this.hashTxId = transactionId.slice(2);

        const sender = new TransactionResponse(transactionId, provider);
        const result = await sender.waitForResult();

        return {
            status: result.status.type,
            block: this.makeBlockUrl(),
            gasUsed: result.gasUsed.format(),
            transactionResume: JSON.stringify(result)
        };
    }

    private makeBlockUrl() {
        return `https://fuellabs.github.io/block-explorer-v2/transaction/0x${this.hashTxId}?providerUrl=${encodeURIComponent(this.getNetwork())}`;
    }

    public getHashTxId() {
        return this.hashTxId;
    }

    public getTransaction() {
        return this.transaction;
    }

    public setWitnesses(witnesses: string[]) {
        this.witnesses = [...this.witnesses, ...witnesses];
        return this.witnesses;
    }

    public getStatusWitnesses() {
        return {
            required: Number(this.configurable.SIGNATURES_COUNT),
            signed: this.witnesses.length,
            witnesses: witnessesStatus(this.witnesses, this.configurable.SIGNERS, this.hashTxId)
        };
    }

    public getAssets() {
        return this.assets;
    }
}
