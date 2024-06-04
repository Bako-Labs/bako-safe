import { Provider, TransactionStatus, bn } from 'fuels';
import { authService, delay, IUserAuth, newVault, signin } from '../utils';
import { BakoSafe } from '../../configurables';
import { accounts, assets, DEFAULT_BALANCE_VALUE, networks } from '../mocks';
import {
  DEFAULT_MULTI_ASSET_TRANSACTION_PAYLOAD,
  DEFAULT_TRANSACTION_PAYLOAD,
} from '../mocks/transactions';
import { Vault } from '../../src/modules/vault/Vault';
import { IPayloadVault } from '../../src/modules/vault/types';

describe('[TRANSFERS]', () => {
  let chainId: number;
  let auth: IUserAuth;
  let provider: Provider;
  let signers: string[];

  //example to sett up the provider
  BakoSafe.setProviders({
    CHAIN_URL: 'http://localhost:4000/v1/graphql',
    SERVER_URL: 'http://localhost:3333',
    CLIENT_URL: 'http://localhost:5174',
  });

  beforeAll(async () => {
    provider = await Provider.create(BakoSafe.getProviders('CHAIN_URL'));
    chainId = provider.getChainId();
    auth = await authService(
      ['USER_1', 'USER_2', 'USER_3', 'USER_5', 'USER_4'],
      provider.url,
    );

    signers = [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
      accounts['USER_3'].address,
    ];
  }, 30 * 1000);

  test(
    'Created an valid transaction to vault and instance old transaction',
    async () => {
      const vault = await newVault(
        signers,
        provider,
        auth['USER_1'].BakoSafeAuth,
        100,
      );
      const tx = DEFAULT_TRANSACTION_PAYLOAD(accounts['STORE'].address);

      const transaction = await vault.BakoSafeIncludeTransaction(tx);

      const signTimeout = async () => {
        await delay(5000);
        await signin(
          transaction.getHashTxId(),
          'USER_3',
          auth['USER_3'].BakoSafeAuth,
          transaction.BakoSafeTransactionId,
        );

        await delay(5000);
        await signin(
          transaction.getHashTxId(),
          'USER_2',
          auth['USER_2'].BakoSafeAuth,
          transaction.BakoSafeTransactionId,
        );
      };

      // Signin transaction
      await signin(
        transaction.getHashTxId(),
        'USER_1',
        auth['USER_1'].BakoSafeAuth,
        transaction.BakoSafeTransactionId,
      );

      const oldTransaction = await vault.BakoSafeGetTransaction(
        transaction.BakoSafeTransactionId,
      );

      oldTransaction.send();

      // this process isan`t async, next line is async
      signTimeout();
      const result = await transaction.wait();

      expect(result.status).toBe(TransactionStatus.success);
    },
    100 * 1000,
  );

  test(
    'Sign transactions with invalid users',
    async () => {
      const vault = await newVault(
        signers,
        provider,
        auth['USER_1'].BakoSafeAuth,
        100,
      );
      const tx = DEFAULT_TRANSACTION_PAYLOAD(accounts['STORE'].address);

      const transaction = await vault.BakoSafeIncludeTransaction(tx);
      expect(
        await signin(
          transaction.getHashTxId(),
          'USER_2',
          auth['USER_2'].BakoSafeAuth,
          transaction.BakoSafeTransactionId,
        ),
      ).toBe(true);
      expect(
        await signin(
          transaction.getHashTxId(),
          'USER_1',
          auth['USER_1'].BakoSafeAuth,
          transaction.BakoSafeTransactionId,
        ),
      ).toBe(true);
      expect(
        await signin(
          transaction.getHashTxId(),
          'USER_3',
          auth['USER_3'].BakoSafeAuth,
          transaction.BakoSafeTransactionId,
        ),
      ).toBe(true);
      expect(
        await signin(
          transaction.getHashTxId(),
          'USER_4',
          auth['USER_4'].BakoSafeAuth,
          transaction.BakoSafeTransactionId,
        ),
      ).toBe(false);
      transaction.send();
      const result = await transaction.wait();
      expect(result.status).toBe(TransactionStatus.success);
    },
    100 * 1000,
  );

  test(
    'Instance old transaction',
    async () => {
      const vault = await newVault(
        signers,
        provider,
        auth['USER_1'].BakoSafeAuth,
        100,
      );
      const tx = DEFAULT_TRANSACTION_PAYLOAD(accounts['STORE'].address);

      // Create a transaction
      const transaction = await vault.BakoSafeIncludeTransaction(tx);
      const transaction_aux = await vault.BakoSafeGetTransaction(
        transaction.BakoSafeTransactionId,
      );
      const transaction_aux_byhash = await vault.BakoSafeGetTransaction(
        transaction.getHashTxId(),
      );

      expect(transaction_aux.BakoSafeTransactionId).toStrictEqual(
        transaction.BakoSafeTransactionId,
      );
      expect(transaction_aux_byhash.BakoSafeTransactionId).toStrictEqual(
        transaction.BakoSafeTransactionId,
      );
    },
    10 * 1000,
  );

  test('Send an transaction to with vault without balance', async () => {
    const vault = await newVault(
      signers,
      provider,
      auth['USER_1'].BakoSafeAuth,
    );
    const tx_a = DEFAULT_TRANSACTION_PAYLOAD(accounts['STORE'].address);
    tx_a.assets[0].amount = '100';

    await expect(vault.BakoSafeIncludeTransaction(tx_a)).rejects.toThrow(
      'FuelError: not enough coins to fit the target',
    );
  });

  test('Sent a transaction without BakoSafeAuth', async () => {
    const vault = await newVault(signers, provider, undefined, 100);
    const tx = DEFAULT_TRANSACTION_PAYLOAD(accounts['STORE'].address);

    const transaction = await vault.BakoSafeIncludeTransaction(tx);
    transaction.witnesses = [
      await signin(transaction.getHashTxId(), 'USER_1'),
      await signin(transaction.getHashTxId(), 'USER_2'),
      await signin(transaction.getHashTxId(), 'USER_3'),
    ];

    const result = await transaction.send().then(async (tx) => {
      if ('wait' in tx) {
        return await tx.wait();
      }
      return {
        status: TransactionStatus.failure,
      };
    });

    expect(result.status).toBe(TransactionStatus.success);
  });

  test('Send a transaction with production fuel node', async () => {
    const _provider = await Provider.create(networks['DEVNET']);
    //valid only for devnet
    const HASH_PREDICATE =
      '0xb2bf0410c0574e5a9abf4ac5579cdcbf5bd33c1015b2a74bb34acc9069b7dc8a';
    const tx_name = 'Test Transaction on DEVNET';
    const VaultPayload: IPayloadVault = {
      configurable: {
        SIGNATURES_COUNT: 1,
        SIGNERS: signers,
        network: _provider.url,
        HASH_PREDICATE,
      },
      BakoSafeAuth: auth['USER_1'].BakoSafeAuth,
    };

    const _vault = await Vault.create(VaultPayload);

    await expect(
      await _vault
        .BakoSafeIncludeTransaction({
          name: tx_name,
          assets: [
            {
              assetId: _provider.getBaseAssetId(),
              to: accounts['STORE'].address,
              amount: DEFAULT_BALANCE_VALUE.format(),
            },
          ],
        })
        .then((tx) => {
          return tx.name;
        }),
    ).toBe(tx_name);

    await expect(
      _vault.BakoSafeIncludeTransaction({
        name: tx_name,
        assets: [
          {
            assetId: _provider.getBaseAssetId(),
            to: accounts['STORE'].address,
            amount: '0.5',
          },
        ],
      }),
    ).rejects.toThrow('FuelError: not enough coins to fit the target');
  });

  test('Send transaction with multiple assets ids', async () => {
    const txAssets = Object.values(assets);
    const vault = await newVault(
      signers,
      provider,
      auth['USER_1'].BakoSafeAuth,
      100,
      undefined,
      txAssets,
    );
    const tx = DEFAULT_MULTI_ASSET_TRANSACTION_PAYLOAD(
      accounts['STORE'].address,
    );
    const tx_name = tx.name;

    expect(
      await vault.BakoSafeIncludeTransaction(tx).then((tx) => {
        return tx.name;
      }),
    ).toBe(tx_name);
  });
});
