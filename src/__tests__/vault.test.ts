import { Address, BN, Provider, TransactionStatus, Wallet, bn } from 'fuels';
import { IPayloadTransfer, IPayloadVault, Vault } from '../library';
import { TransactionService } from '../library/api/transactions';
import { ITransferAsset } from '../library/assets';
import assets from '../mocks/assets';

import { defaultConfigurable } from '../library/configurables';
import { IUserAuth, authService } from './utils/auth';
import { accounts } from '../mocks/accounts';

describe('Test Vault', () => {
    let chainId: number;
    let auth: IUserAuth;

    const fuelProvider = new Provider(defaultConfigurable['provider']);
    const txParams = {
        gasPrice: bn(1)
    };

    const rootWallet = Wallet.fromPrivateKey(accounts['FULL'].privateKey, fuelProvider);

    const signers = [accounts['USER_1'].address, accounts['USER_2'].address, accounts['USER_3'].address];

    beforeAll(async () => {
        chainId = await fuelProvider.getChainId();
        auth = await authService(['USER_1', 'USER_2', 'USER_3', 'USER_5', 'USER_4']);
    });

    const sendPredicateCoins = async (predicate: Vault, amount: BN, asset: 'ETH' | 'DAI' | 'sETH') => {
        const deposit = await rootWallet.transfer(predicate.address, amount, assets[asset], txParams);
        await deposit.wait();
    };

    const signin = async (BSAFETransactionId: string, tx_hash: string, account: 'FULL' | 'USER_1' | 'USER_2' | 'USER_3' | 'USER_4' | 'USER_5') => {
        const signer = Wallet.fromPrivateKey(accounts[account].privateKey, fuelProvider);
        const tx = await signer.signMessage(tx_hash);
        const acc = Address.fromString(accounts[account].address).toHexString();
        const serviceTransactions = new TransactionService(auth[account].BSAFEAuth);
        return await serviceTransactions.sign(BSAFETransactionId, acc, tx);
    };

    const delay = (ms: number): Promise<void> => {
        return new Promise((resolve) => setTimeout(resolve, ms));
    };

    // -> create predicate with USER_1 owner
    const newVault = async () => {
        const VaultPayload: IPayloadVault = {
            configurable: {
                SIGNATURES_COUNT: 3,
                SIGNERS: signers,
                network: fuelProvider.url,
                chainId: chainId
            },
            BSAFEAuth: auth['USER_1'].BSAFEAuth
        };
        const vault = new Vault(VaultPayload);

        await sendPredicateCoins(vault, bn(1_000_000_000), 'sETH');
        await sendPredicateCoins(vault, bn(1_000_000_000), 'ETH');

        return vault;
    };

    test('Create an inválid vault', async () => {
        const VaultPayload: IPayloadVault = {
            configurable: {
                HASH_PREDUCATE: undefined,
                SIGNATURES_COUNT: 3,
                SIGNERS: signers,
                network: fuelProvider.url,
                chainId: chainId
            },
            BSAFEAuth: auth['USER_1'].BSAFEAuth
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

    test('Created an valid vault', async () => {
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

    test(
        'Instance an old Vault by predicate address',
        async () => {
            const vault = await newVault();

            const auxVault = await Vault.instanceVault(auth['USER_1'].BSAFEAuth, {
                BSAFEPredicateId: vault.BSAFEVaultId
            });
            expect(auxVault.BSAFEVaultId).toStrictEqual(vault.BSAFEVaultId);
        },
        10 * 1000
    );

    test(
        'Instance an old Vault by predicate address',
        async () => {
            const vault = await newVault();

            const auxVault = await Vault.instanceVault(auth['USER_1'].BSAFEAuth, {
                predicateAddress: vault.address.toString()
            });
            expect(auxVault.BSAFEVaultId).toStrictEqual(vault.BSAFEVaultId);
        },
        10 * 1000
    );

    test(
        'Sign transactions with invalid users',
        async () => {
            const vault = await newVault();
            const _assets: ITransferAsset[] = [
                {
                    amount: bn(1_000_000).format(),
                    assetId: assets['sETH'],
                    to: accounts['STORE'].address
                }
            ];
            const newTransfer: IPayloadTransfer = {
                assets: _assets,
                witnesses: []
            };
            const transaction = await vault.BSAFEIncludeTransaction(newTransfer);
            expect(await signin(transaction.BSAFETransactionId, transaction.getHashTxId(), 'USER_2')).toBe(true);
            expect(await signin(transaction.BSAFETransactionId, transaction.getHashTxId(), 'USER_1')).toBe(true);
            expect(await signin(transaction.BSAFETransactionId, transaction.getHashTxId(), 'USER_3')).toBe(true);
            expect(await signin(transaction.BSAFETransactionId, transaction.getHashTxId(), 'USER_5')).toBe(false);

            transaction.send();
            const result = await transaction.wait();
            expect(result.status).toBe(TransactionStatus.success);
        },
        100 * 1000
    );

    test(
        'Created an valid transaction to vault and instance old transaction',
        async () => {
            const vault = await newVault();
            const _assets: ITransferAsset[] = [
                {
                    amount: bn(1_000).format(),
                    assetId: assets['sETH'],
                    to: accounts['STORE'].address
                }
            ];

            const signTimeout = async () => {
                await delay(5000);
                await signin(transaction.BSAFETransactionId, transaction.getHashTxId(), 'USER_3');

                await delay(5000);
                await signin(transaction.BSAFETransactionId, transaction.getHashTxId(), 'USER_2');
            };

            const newTransfer: IPayloadTransfer = {
                assets: _assets,
                witnesses: []
            };

            // Create a transaction
            const transaction = await vault.BSAFEIncludeTransaction(newTransfer);

            // Signin transaction
            await signin(transaction.BSAFETransactionId, transaction.getHashTxId(), 'USER_1');

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
        const vault = await newVault();
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

        // Create a transaction
        const transaction = await vault.BSAFEIncludeTransaction(_assetsA);
        const transaction_aux = await vault.BSAFEIncludeTransaction(transaction.BSAFETransactionId);

        expect(transaction_aux.BSAFETransactionId).toStrictEqual(transaction.BSAFETransactionId);
    });

    test('Send an transaction to with vault without balance', async () => {
        const vault = await newVault();
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
            ],
            witnesses: []
        };

        const _assetsB: IPayloadTransfer = {
            assets: [
                {
                    amount: bn(1_000_000_000_000_000).format(),
                    assetId: assets['sETH'],
                    to: accounts['STORE'].address
                }
            ],
            witnesses: []
        };
        // Create a transaction
        await expect(vault.BSAFEIncludeTransaction(_assetsA)).rejects.toThrow(`Insufficient balance for ${assets['ETH']}`);
        await expect(vault.BSAFEIncludeTransaction(_assetsB)).rejects.toThrow(`Insufficient balance for ${assets['sETH']}`);
    });

    test(
        'Find a transactions of predicate and return an list of Transfer instances',
        async () => {
            const vault = await newVault();
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
                ],
                witnesses: []
            };

            const transaction = await vault.BSAFEIncludeTransaction(_assetsA);
            await vault.BSAFEIncludeTransaction(_assetsB);

            await signin(transaction.BSAFETransactionId, transaction.getHashTxId(), 'USER_2');

            const transactions = await vault.getTransactions();
            expect(transactions.length).toBe(2);
        },
        100 * 1000
    );

    test('Call an method of vault depends of auth without credentials', async () => {
        const VaultPayload: IPayloadVault = {
            configurable: {
                SIGNATURES_COUNT: 3,
                SIGNERS: signers,
                network: fuelProvider.url,
                chainId: chainId
            }
        };
        const vault = new Vault(VaultPayload);

        await sendPredicateCoins(vault, bn(1_000_000_000), 'sETH');
        await sendPredicateCoins(vault, bn(1_000_000_000), 'ETH');

        await expect(vault.getConfigurable().SIGNATURES_COUNT).toBe(3);
        await expect(vault.getTransactions()).rejects.toThrow('Auth is required');
    });
});
