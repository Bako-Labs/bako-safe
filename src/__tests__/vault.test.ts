import { Address, BN, Provider, Signer, Wallet, bn, hashMessage } from 'fuels';
import { IPayloadTransfer, IPayloadVault, Vault } from '../library';
import { TransactionService } from '../library/api/transactions';
import { ITransferAsset } from '../library/assets';
import accounts from '../mocks/accounts';
import assets from '../mocks/assets';
describe('Test Vault', () => {
    const fuelProvider = new Provider('http://localhost:4000/graphql');
    const txParams = {
        gasPrice: bn(1)
    };
    let chainId: number;
    const serviceTransactions = new TransactionService();

    const rootWallet = Wallet.fromPrivateKey(accounts['FULL'].privateKey, fuelProvider);

    const signers = [accounts['USER_1'].address, accounts['USER_2'].address, accounts['USER_3'].address];

    beforeAll(async () => {
        chainId = await fuelProvider.getChainId();
    });

    const sendPredicateCoins = async (predicate: Vault, amount: BN, asset: 'ETH' | 'DAI' | 'sETH') => {
        const deposit = await rootWallet.transfer(predicate.address, amount, assets[asset], txParams);
        await deposit.wait();
    };

    const signin = async (BSAFETransactionId: string, tx_hash: string, account: 'FULL' | 'USER_1' | 'USER_2' | 'USER_3' | 'USER_4' | 'USER_5') => {
        const signer = Wallet.fromPrivateKey(accounts[account].privateKey, fuelProvider);
        const tx = await signer.signMessage(tx_hash);
        const acc = Address.fromString(accounts[account].address).toHexString();
        await serviceTransactions.sign(BSAFETransactionId, acc, tx);
    };

    const newVault = async () => {
        const VaultPayload: IPayloadVault = {
            configurable: {
                HASH_PREDUCATE: undefined,
                SIGNATURES_COUNT: 3,
                SIGNERS: signers,
                network: fuelProvider.url,
                chainId: chainId
            }
        };
        const vault = new Vault(VaultPayload);

        await sendPredicateCoins(vault, bn(1_000_000_000), 'sETH');
        await sendPredicateCoins(vault, bn(1_000_000_000), 'ETH');

        return vault;
    };

    it('Create an inválid vault', async () => {
        const VaultPayload: IPayloadVault = {
            configurable: {
                HASH_PREDUCATE: undefined,
                SIGNATURES_COUNT: 3,
                SIGNERS: signers,
                network: fuelProvider.url,
                chainId: chainId
            }
        };

        VaultPayload.configurable.SIGNATURES_COUNT = 0;
        expect(() => new Vault(VaultPayload)).toThrow('SIGNATURES_COUNT is required must be granter than zero');

        VaultPayload.configurable.SIGNATURES_COUNT = 3;
        VaultPayload.configurable.SIGNERS = [];
        expect(() => new Vault(VaultPayload)).toThrow('SIGNERS must be greater than zero');

        VaultPayload.configurable.SIGNERS = signers;
        VaultPayload.configurable.SIGNATURES_COUNT = 5;

        expect(() => new Vault(VaultPayload)).toThrow('Required Signers must be less than signers');
    });

    it('Created an valid vault', async () => {
        const vault = await newVault();
        await sendPredicateCoins(vault, bn(1_000_000), 'sETH');
        await sendPredicateCoins(vault, bn(1_000_000), 'ETH');

        expect(await vault.getBalances()).toStrictEqual([
            {
                assetId: assets['ETH'],
                amount: bn(1_000_000).add(1_000_000_000)
            },
            {
                assetId: assets['sETH'],
                amount: bn(1_000_000).add(1_000_000_000)
            }
        ]);
    });

    it('Instance an old Vault', async () => {
        const vault = await newVault();
        const conf = vault.getConfigurable();
        const abi = vault.getAbi();
        const bin = vault.getBin();

        const payloadAux: IPayloadVault = {
            configurable: {
                HASH_PREDUCATE: conf.HASH_PREDUCATE,
                SIGNATURES_COUNT: Number(conf.SIGNATURES_COUNT),
                SIGNERS: conf.SIGNERS,
                network: conf.network,
                chainId: conf.chainId
            },
            abi: JSON.stringify(abi),
            bytecode: bin
        };

        const auxVault = new Vault(payloadAux);
        expect(auxVault.getConfigurable().HASH_PREDUCATE).toStrictEqual(conf.HASH_PREDUCATE);
    });

    it('Created an valid transaction to vault', async () => {
        const vault = await newVault();
        const _assets: ITransferAsset[] = [
            {
                amount: bn(1_000).format(),
                assetId: assets['sETH'],
                to: accounts['STORE'].address
            }
        ];

        const newTransfer: IPayloadTransfer = {
            assets: _assets,
            witnesses: []
        };

        // const assets_aux: ITransferAsset[] = [
        //     {
        //         amount: bn(1_000).format(),
        //         assetId: assets['sETH'],
        //         to: accounts['STORE'].address
        //     }
        // ];

        // const newTransfer_aux: IPayloadTransfer = {
        //     assets: assets_aux,
        //     witnesses: []
        // };

        // Create a transaction
        const transaction = await vault.BSAFEIncludeTransaction(newTransfer);
        // const _transaction = await vault.BSAFEIncludeTransaction(newTransfer_aux);

        // Signin transaction
        await signin(transaction.BSAFETransactionId, transaction.getHashTxId(), 'USER_1');
        await signin(transaction.BSAFETransactionId, transaction.getHashTxId(), 'USER_2');
        await signin(transaction.BSAFETransactionId, transaction.getHashTxId(), 'USER_3');

        //console.log(oldTransaction.getHashTxId());
        const oldTransaction = await vault.BSAFEIncludeTransaction(transaction.BSAFETransactionId);

        console.log('[TRANSACTIONS_ID]: ', {
            new: transaction.getHashTxId(),
            old: oldTransaction.getHashTxId(),
            transaction: oldTransaction.witnesses,
            witness: oldTransaction.witnesses.map((witness) => {
                return Signer.recoverAddress(hashMessage(transaction.getHashTxId()), witness);
            })
        });

        const result = await oldTransaction.sendTransaction();
        console.log(result);
        //expect(await vault.findTransactions(transaction.hash)).toHaveProperty('transaction');
        //expect(transaction.witnesses.length).toBe(5);
        expect(result.status).toBe('success');
    });

    // it('Created an valid transaction to vault', async () => {
    //     const vault = await newVault();
    //     const _assets: ITransferAsset[] = [
    //         {
    //             amount: bn(1_000).format(),
    //             assetId: assets['ETH'],
    //             to: accounts['STORE'].address
    //         },
    //         {
    //             amount: bn(1_000_000).format(),
    //             assetId: assets['sETH'],
    //             to: accounts['STORE'].address
    //         }
    //     ];
    //     // Create a transaction
    //     const transaction = await vault.includeTransaction(_assets, []);

    //     // Signin transaction
    //     const witnesses = [
    //         await signin(transaction.getHashTxId(), 'USER_1'),
    //         await signin(transaction.getHashTxId(), 'USER_2'),
    //         await signin(transaction.getHashTxId(), 'USER_3'),
    //         await signin(transaction.getHashTxId(), 'USER_4'),
    //         await signin(transaction.getHashTxId(), 'USER_5')
    //     ];

    //     //transaction.setWitnesses
    //     transaction.witnesses = witnesses;

    //     const result = await transaction.sendTransaction();
    //     //console.log(result);
    //     expect(transaction.witnesses.length).toBe(5);
    //     expect(result.status).toBe('success');
    // });

    // it('Send an transaction to with vault without balance', async () => {
    //     const vault = await newVault();
    //     const _assetsA: ITransferAsset[] = [
    //         {
    //             amount: bn(1_000_000_000_000_000).format(),
    //             assetId: assets['ETH'],
    //             to: accounts['STORE'].address
    //         },
    //         {
    //             amount: bn(1_000_000_000_000_000).format(),
    //             assetId: assets['sETH'],
    //             to: accounts['STORE'].address
    //         }
    //     ];

    //     const _assetsB: ITransferAsset[] = [
    //         {
    //             amount: bn(1_000_000_000_000_000).format(),
    //             assetId: assets['sETH'],
    //             to: accounts['STORE'].address
    //         }
    //     ];
    //     // Create a transaction
    //     await expect(vault.includeTransaction(_assetsA, [])).rejects.toThrow(`Insufficient balance for ${assets['ETH']}`);
    //     await expect(vault.includeTransaction(_assetsB, [])).rejects.toThrow(`Insufficient balance for ${assets['sETH']}`);
    // });

    // it('Send transaction without required signers', async () => {
    //     const vault = await newVault();
    //     const _assets: ITransferAsset[] = [
    //         {
    //             amount: bn(1_000).format(),
    //             assetId: assets['ETH'],
    //             to: accounts['STORE'].address
    //         }
    //     ];

    //     const transaction = await vault.includeTransaction(_assets, []);

    //     const witnesses = [await signin(transaction.getHashTxId(), 'USER_1'), await signin(transaction.getHashTxId(), 'USER_2')];

    //     transaction.witnesses = witnesses;
    //     await expect(transaction.sendTransaction()).rejects.toThrow('PredicateVerificationFailed');
    // });

    // it('Send transaction with invalid sign', async () => {
    //     const vault = await newVault();
    //     const _assets: ITransferAsset[] = [
    //         {
    //             amount: bn(1_000).format(),
    //             assetId: assets['ETH'],
    //             to: accounts['STORE'].address
    //         }
    //     ];

    //     const transaction = await vault.includeTransaction(_assets, []);
    //     const witnesses = [await signin(transaction.getHashTxId(), 'USER_1'), await signin(transaction.getHashTxId(), 'USER_2'), defaultValues['signature']];

    //     transaction.witnesses = witnesses;
    //     await expect(transaction.sendTransaction()).rejects.toThrow('PredicateVerificationFailed');
    // });
});
