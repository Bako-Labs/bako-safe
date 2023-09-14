import { BN, Provider, Wallet, bn } from 'fuels';
import { IPayloadVault, Vault } from '../library';
import { ITransferAsset } from '../library/assets';
import { defaultValues } from '../library/predicates/helpers';
import accounts from '../mocks/accounts';
import assets from '../mocks/assets';

describe('Test Vault', () => {
    const fuelProvider = new Provider('http://localhost:4000/graphql');
    const txParams = {
        gasPrice: bn(1)
    };
    const rootWallet = Wallet.fromPrivateKey(accounts['FULL'].privateKey, fuelProvider);

    const signers = [accounts['USER_1'].address, accounts['USER_2'].address, accounts['USER_3'].address];

    // make your vault
    const VaultPayload: IPayloadVault = {
        configurable: {
            HASH_PREDUCATE: undefined,
            SIGNATURES_COUNT: 3,
            SIGNERS: signers,
            network: fuelProvider.url
        }
    };
    const vault = new Vault(VaultPayload);

    const sendPredicateCoins = async (predicate: Vault, amount: BN, asset: 'ETH' | 'DAI' | 'sETH') => {
        // Deposit coins to the predicate
        const deposit = await rootWallet.transfer(predicate.address, amount, assets[asset], txParams);
        await deposit.wait();
        //await expect(predicate.getBalance()).resolves.toEqual(amount);
    };

    const signin = async (tx_hash: string, account: 'FULL' | 'USER_1' | 'USER_2' | 'USER_3' | 'USER_4' | 'USER_5') => {
        const signer = Wallet.fromPrivateKey(accounts[account].privateKey, fuelProvider);
        return signer.signMessage(tx_hash);
    };

    it('Create an inválid vault', async () => {
        let vaultPayload = VaultPayload;

        vaultPayload.configurable.SIGNATURES_COUNT = 0;
        expect(() => new Vault(vaultPayload)).toThrow('SIGNATURES_COUNT is required must be granter than zero');

        vaultPayload.configurable.SIGNATURES_COUNT = 3;
        vaultPayload.configurable.SIGNERS = [];
        expect(() => new Vault(vaultPayload)).toThrow('SIGNERS must be greater than zero');

        vaultPayload.configurable.SIGNERS = signers;
        vaultPayload.configurable.SIGNATURES_COUNT = 5;

        expect(() => new Vault(vaultPayload)).toThrow('Required Signers must be less than signers');
    });

    it('Created an valid vault', async () => {
        await sendPredicateCoins(vault, bn(1_000_000_000), 'sETH');
        await sendPredicateCoins(vault, bn(1_000_000_000), 'ETH');

        expect(await vault.getBalances()).toStrictEqual([
            {
                assetId: assets['ETH'],
                amount: bn(1_000_000_000)
            },
            {
                assetId: assets['sETH'],
                amount: bn(1_000_000_000)
            }
        ]);
    });

    it('Instance an old Vault', async () => {
        const conf = vault.getConfigurable();
        const abi = vault.getAbi();
        const bin = vault.getBin();

        const payloadAux: IPayloadVault = {
            configurable: {
                HASH_PREDUCATE: conf.HASH_PREDUCATE,
                SIGNATURES_COUNT: Number(conf.SIGNATURES_COUNT),
                SIGNERS: conf.SIGNERS,
                network: vault.getNetwork()
            },
            abi: JSON.stringify(abi),
            bytecode: bin
        };

        const auxVault = new Vault(payloadAux);
        expect(auxVault.getConfigurable().HASH_PREDUCATE).toStrictEqual(conf.HASH_PREDUCATE);
    });

    it('Created an valid transaction to vault', async () => {
        const _assets: ITransferAsset[] = [
            {
                amount: bn(1_000).format(),
                assetId: assets['sETH'],
                to: accounts['STORE'].address
            }
        ];

        // Create a transaction
        const transaction = await vault.includeTransaction(_assets, []);

        // Signin transaction
        const witnesses = [
            await signin(transaction.transaction.getHashTxId(), 'USER_1'),
            await signin(transaction.transaction.getHashTxId(), 'USER_2'),
            await signin(transaction.transaction.getHashTxId(), 'USER_3'),
            await signin(transaction.transaction.getHashTxId(), 'USER_4'),
            await signin(transaction.transaction.getHashTxId(), 'USER_5')
        ];

        //transaction.transaction.setWitnesses
        transaction.transaction.witnesses = witnesses;

        const result = await transaction.transaction.sendTransaction();

        expect(await vault.findTransactions(transaction.hash)).toHaveProperty('transaction');
        expect(transaction.transaction.witnesses.length).toBe(5);
        expect(result.status).toBe('success');
    });

    it('Created an valid transaction to vault', async () => {
        const _assets: ITransferAsset[] = [
            {
                amount: bn(1_000).format(),
                assetId: assets['ETH'],
                to: accounts['STORE'].address
            },
            {
                amount: bn(1_000_000).format(),
                assetId: assets['sETH'],
                to: accounts['STORE'].address
            }
        ];
        // Create a transaction
        const transaction = await vault.includeTransaction(_assets, []);

        // Signin transaction
        const witnesses = [
            await signin(transaction.transaction.getHashTxId(), 'USER_1'),
            await signin(transaction.transaction.getHashTxId(), 'USER_2'),
            await signin(transaction.transaction.getHashTxId(), 'USER_3'),
            await signin(transaction.transaction.getHashTxId(), 'USER_4'),
            await signin(transaction.transaction.getHashTxId(), 'USER_5')
        ];

        //transaction.transaction.setWitnesses
        transaction.transaction.witnesses = witnesses;

        const result = await transaction.transaction.sendTransaction();

        expect(await vault.findTransactions(transaction.hash)).toHaveProperty('transaction');
        expect(transaction.transaction.witnesses.length).toBe(5);
        expect(result.status).toBe('success');
    });

    it('Send an transaction to with vault without balance', async () => {
        const _assetsA: ITransferAsset[] = [
            {
                amount: bn(1_000_000_000).format(),
                assetId: assets['ETH'],
                to: accounts['STORE'].address
            },
            {
                amount: bn(1_000_000_000).format(),
                assetId: assets['sETH'],
                to: accounts['STORE'].address
            }
        ];

        const _assetsB: ITransferAsset[] = [
            {
                amount: bn(1_000_000_000).format(),
                assetId: assets['sETH'],
                to: accounts['STORE'].address
            }
        ];
        // Create a transaction
        await expect(vault.includeTransaction(_assetsA, [])).rejects.toThrow(`Insufficient balance for ${assets['ETH']}`);
        await expect(vault.includeTransaction(_assetsB, [])).rejects.toThrow(`Insufficient balance for ${assets['sETH']}`);
    });

    it('Send transaction without required signers', async () => {
        const _assets: ITransferAsset[] = [
            {
                amount: bn(1_000).format(),
                assetId: assets['ETH'],
                to: accounts['STORE'].address
            }
        ];

        const transaction = await vault.includeTransaction(_assets, []);

        const witnesses = [await signin(transaction.transaction.getHashTxId(), 'USER_1'), await signin(transaction.transaction.getHashTxId(), 'USER_2')];

        transaction.transaction.witnesses = witnesses;
        await expect(transaction.transaction.sendTransaction()).rejects.toThrow('PredicateVerificationFailed');
    });

    it('Send transaction with invalid sign', async () => {
        const _assets: ITransferAsset[] = [
            {
                amount: bn(1_000).format(),
                assetId: assets['ETH'],
                to: accounts['STORE'].address
            }
        ];

        const transaction = await vault.includeTransaction(_assets, []);
        const witnesses = [
            await signin(transaction.transaction.getHashTxId(), 'USER_1'),
            await signin(transaction.transaction.getHashTxId(), 'USER_2'),
            defaultValues['signature']
            //await signin(transaction.transaction.getHashTxId(), 'USER_3')
        ];

        transaction.transaction.witnesses = witnesses;
        await expect(transaction.transaction.sendTransaction()).rejects.toThrow('PredicateVerificationFailed');
    });
});
