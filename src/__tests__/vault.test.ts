import { Provider, TransactionStatus, bn } from 'fuels';
import { IPayloadTransfer, IPayloadVault, Vault } from '../library';
import { ITransferAsset } from '../library/assets';
import { rootWallet, sendPredicateCoins, signin, delay, newVault } from '../utils';
import { defaultConfigurable } from '../configurables';

import { accounts } from '../mocks/accounts';
import { IUserAuth, authService, assets } from '../mocks';

describe('Test Vault', () => {
    let chainId: number;
    let auth: IUserAuth;
    let provider: Provider;
    let signers: string[];

    beforeAll(async () => {
        provider = await Provider.create(defaultConfigurable['provider']);
        chainId = await provider.getChainId();
        auth = await authService(['USER_1', 'USER_2', 'USER_3', 'USER_5', 'USER_4']);
        signers = [accounts['USER_1'].address, accounts['USER_2'].address, accounts['USER_3'].address];
    });

    test('Create an inválid vault', async () => {
        const VaultPayload: IPayloadVault = {
            configurable: {
                HASH_PREDICATE: undefined,
                SIGNATURES_COUNT: 3,
                SIGNERS: signers,
                network: provider.url,
                chainId: chainId
            },
            provider,
            BSAFEAuth: auth['USER_1'].BSAFEAuth
        };

        VaultPayload.configurable.SIGNATURES_COUNT = 0;

        await expect(Vault.create(VaultPayload)).rejects.toThrow('SIGNATURES_COUNT is required must be granter than zero');

        VaultPayload.configurable.SIGNATURES_COUNT = 3;
        VaultPayload.configurable.SIGNERS = [];
        await expect(Vault.create(VaultPayload)).rejects.toThrow('SIGNERS must be greater than zero');

        VaultPayload.configurable.SIGNERS = signers;
        VaultPayload.configurable.SIGNATURES_COUNT = 5;

        await expect(Vault.create(VaultPayload)).rejects.toThrow('Required Signers must be less than signers');
    });

    test('Created an valid vault', async () => {
        const vault = await newVault(signers, provider, auth['USER_1'].BSAFEAuth);
        await sendPredicateCoins(vault, bn(1_000_000), 'sETH', rootWallet);
        await sendPredicateCoins(vault, bn(1_000_000), 'ETH', rootWallet);

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

    test(
        'Instance an old Vault by BSAFEPredicate ID',
        async () => {
            const vault = await newVault(signers, provider, auth['USER_1'].BSAFEAuth);
            const auxVault = await Vault.create({
                ...auth['USER_1'].BSAFEAuth,
                id: vault.BSAFEVaultId
            });
            expect(auxVault.BSAFEVaultId).toStrictEqual(vault.BSAFEVaultId);
        },
        10 * 1000
    );

    test(
        'Instance an old Vault by predicate address',
        async () => {
            const vault = await newVault(signers, provider, auth['USER_1'].BSAFEAuth);

            const auxVault = await Vault.create({
                ...auth['USER_1'].BSAFEAuth,
                predicateAddress: vault.address.toString()
            });
            expect(auxVault.BSAFEVaultId).toStrictEqual(vault.BSAFEVaultId);
        },
        10 * 1000
    );

    test(
        'Sign transactions with invalid users',
        async () => {
            console.log('[INSTANCE] invalid');
            const vault = await newVault(signers, provider, auth['USER_1'].BSAFEAuth);
            const _assets: ITransferAsset[] = [
                {
                    amount: bn(1_000_000).format(),
                    assetId: assets['sETH'],
                    to: accounts['STORE'].address
                }
            ];
            const newTransfer: IPayloadTransfer = {
                assets: _assets
            };

            const transaction = await vault.BSAFEIncludeTransaction(newTransfer);
            expect(await signin(transaction.getHashTxId(), 'USER_2', auth['USER_2'].BSAFEAuth, transaction.BSAFETransactionId)).toBe(true);
            expect(await signin(transaction.getHashTxId(), 'USER_1', auth['USER_1'].BSAFEAuth, transaction.BSAFETransactionId)).toBe(true);
            expect(await signin(transaction.getHashTxId(), 'USER_3', auth['USER_3'].BSAFEAuth, transaction.BSAFETransactionId)).toBe(true);
            expect(await signin(transaction.getHashTxId(), 'USER_5', auth['USER_5'].BSAFEAuth, transaction.BSAFETransactionId)).toBe(false);

            transaction.send();
            const result = await transaction.wait();
            expect(result.status).toBe(TransactionStatus.success);
        },
        100 * 1000
    );

    test(
        'Created an valid transaction to vault and instance old transaction',
        async () => {
            const vault = await newVault(signers, provider, auth['USER_1'].BSAFEAuth);
            const _assets: ITransferAsset[] = [
                {
                    amount: bn(1_000).format(),
                    assetId: assets['sETH'],
                    to: accounts['STORE'].address
                }
            ];

            const signTimeout = async () => {
                await delay(5000);
                await signin(transaction.getHashTxId(), 'USER_3', auth['USER_3'].BSAFEAuth, transaction.BSAFETransactionId);

                await delay(5000);
                await signin(transaction.getHashTxId(), 'USER_2', auth['USER_2'].BSAFEAuth, transaction.BSAFETransactionId);
            };

            const newTransfer: IPayloadTransfer = {
                assets: _assets
            };

            // Create a transaction
            const transaction = await vault.BSAFEIncludeTransaction(newTransfer);

            // Signin transaction
            await signin(transaction.getHashTxId(), 'USER_1', auth['USER_1'].BSAFEAuth, transaction.BSAFETransactionId);

            const oldTransaction = await vault.BSAFEIncludeTransaction(transaction.BSAFETransactionId);

            const pending_requirements = await oldTransaction.send();
            expect(pending_requirements.status).toBe('await_requirements');

            // this process isan`t async, next line is async
            signTimeout();

            const result = await transaction.wait();
            expect(result.status).toBe(TransactionStatus.success);
        },
        100 * 1000
    );

    test('Instance old transaction', async () => {
        const vault = await newVault(signers, provider, auth['USER_1'].BSAFEAuth);
        const _assetsA: IPayloadTransfer = {
            assets: [
                {
                    amount: bn(1_000).format(),
                    assetId: assets['ETH'],
                    to: accounts['STORE'].address
                },
                {
                    amount: bn(1_000).format(),
                    assetId: assets['sETH'],
                    to: accounts['STORE'].address
                }
            ]
        };

        // Create a transaction
        const transaction = await vault.BSAFEIncludeTransaction(_assetsA);
        const transaction_aux = await vault.BSAFEIncludeTransaction(transaction.BSAFETransactionId);

        expect(transaction_aux.BSAFETransactionId).toStrictEqual(transaction.BSAFETransactionId);
    });

    test('Send an transaction to with vault without balance', async () => {
        const vault = await newVault(signers, provider, auth['USER_1'].BSAFEAuth);
        const _assetsA: IPayloadTransfer = {
            assets: [
                {
                    amount: bn(1_000_000_000_000_000).format(),
                    assetId: assets['ETH'],
                    to: accounts['STORE'].address
                },
                {
                    amount: bn(1_000_000_000_000_000).format(),
                    assetId: assets['sETH'],
                    to: accounts['STORE'].address
                }
            ]
        };

        const _assetsB: IPayloadTransfer = {
            assets: [
                {
                    amount: bn(1_000_000_000_000_000).format(),
                    assetId: assets['sETH'],
                    to: accounts['STORE'].address
                }
            ]
        };
        // Create a transaction
        await expect(vault.BSAFEIncludeTransaction(_assetsA)).rejects.toThrow(`Insufficient balance for ${assets['ETH']}`);
        await expect(vault.BSAFEIncludeTransaction(_assetsB)).rejects.toThrow(`Insufficient balance for ${assets['sETH']}`);
    });

    test(
        'Find a transactions of predicate and return an list of Transfer instances',
        async () => {
            const vault = await newVault(signers, provider, auth['USER_1'].BSAFEAuth);
            const _assetsA: IPayloadTransfer = {
                assets: [
                    {
                        amount: bn(1_000).format(),
                        assetId: assets['ETH'],
                        to: accounts['STORE'].address
                    },
                    {
                        amount: bn(1_000).format(),
                        assetId: assets['sETH'],
                        to: accounts['STORE'].address
                    }
                ]
            };

            const _assetsB: IPayloadTransfer = {
                assets: [
                    {
                        amount: bn(1_000_00).format(),
                        assetId: assets['ETH'],
                        to: accounts['STORE'].address
                    },
                    {
                        amount: bn(1_000_00).format(),
                        assetId: assets['sETH'],
                        to: accounts['STORE'].address
                    }
                ]
            };

            const transaction = await vault.BSAFEIncludeTransaction(_assetsA);
            await vault.BSAFEIncludeTransaction(_assetsB);

            await signin(transaction.getHashTxId(), 'USER_2', auth['USER_2'].BSAFEAuth, transaction.BSAFETransactionId);

            const transactions = await vault.BSAFEGetTransactions();
            expect(transactions.length).toBe(2);
        },
        100 * 1000
    );

    test('Call an method of vault depends of auth without credentials', async () => {
        const VaultPayload: IPayloadVault = {
            configurable: {
                SIGNATURES_COUNT: 3,
                SIGNERS: signers,
                network: provider.url,
                chainId: chainId
            },
            provider
        };
        const vault = await Vault.create(VaultPayload);

        await sendPredicateCoins(vault, bn(1_000_000_000), 'sETH', rootWallet);
        await sendPredicateCoins(vault, bn(1_000_000_000), 'ETH', rootWallet);

        await expect(vault.getConfigurable().SIGNATURES_COUNT).toBe(3);
        await expect(vault.BSAFEGetTransactions()).rejects.toThrow('Auth is required');
    });

    test('Sent a transaction without BSAFEAuth', async () => {
        const VaultPayload: IPayloadVault = {
            configurable: {
                SIGNATURES_COUNT: 3,
                SIGNERS: signers,
                network: provider.url,
                chainId: chainId
            },
            provider
        };
        const vault = await Vault.create(VaultPayload);

        await sendPredicateCoins(vault, bn(1_000_000_000), 'sETH', rootWallet);
        await sendPredicateCoins(vault, bn(1_000_000_000), 'ETH', rootWallet);

        const _assetsA: IPayloadTransfer = {
            assets: [
                {
                    amount: bn(1_000).format(),
                    assetId: assets['ETH'],
                    to: accounts['STORE'].address
                },
                {
                    amount: bn(1_000).format(),
                    assetId: assets['sETH'],
                    to: accounts['STORE'].address
                }
            ],
            witnesses: []
        };

        const tx = await vault.BSAFEIncludeTransaction(_assetsA);
        tx.BSAFEScript.witnesses = [await signin(tx.getHashTxId(), 'USER_1'), await signin(tx.getHashTxId(), 'USER_2'), await signin(tx.getHashTxId(), 'USER_3')];

        const result = await tx.send().then(async (tx) => await tx.wait());

        expect(result.status).toBe(TransactionStatus.success);
    });
});
