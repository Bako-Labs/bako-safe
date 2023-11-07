import { Provider, TransactionStatus, bn } from 'fuels';
import { IPayloadVault, IFormatTransfer, Vault, Transfer } from '../..';
import { ITransferAsset } from '../../assets';
import {
  rootWallet,
  sendPredicateCoins,
  signin,
  delay,
  newVault,
} from '../../../test-utils';
import { defaultConfigurable } from '../../../configurables';

import { accounts } from '../../../mocks/accounts';
import { IUserAuth, authService, assets } from '../../../mocks';

describe('[TRANSFERS]', () => {
  let chainId: number;
  let auth: IUserAuth;
  let provider: Provider;
  let signers: string[];

  beforeAll(async () => {
    provider = await Provider.create(defaultConfigurable['provider']);
    chainId = await provider.getChainId();
    auth = await authService(
      ['USER_1', 'USER_2', 'USER_3', 'USER_5', 'USER_4'],
      provider.url,
    );
    signers = [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
      accounts['USER_3'].address,
    ];
  });

  test(
    'Sign transactions with invalid users',
    async () => {
      const vault = await newVault(signers, provider, auth['USER_1'].BSAFEAuth);
      const _assets: ITransferAsset[] = [
        {
          amount: bn(1_000_000).format(),
          assetId: assets['sETH'],
          to: accounts['STORE'].address,
        },
      ];
      const newTransfer: IFormatTransfer = {
        name: 'transfer_assests',
        assets: _assets,
        witnesses: [],
      };

      const transaction = await vault.BSAFEIncludeTransaction(newTransfer);
      expect(
        await signin(
          Transfer.getHashTxId(transaction.BSAFEScript, chainId),
          'USER_2',
          auth['USER_2'].BSAFEAuth,
          transaction.BSAFETransactionId,
        ),
      ).toBe(true);
      expect(
        await signin(
          Transfer.getHashTxId(transaction.BSAFEScript, chainId),
          'USER_1',
          auth['USER_1'].BSAFEAuth,
          transaction.BSAFETransactionId,
        ),
      ).toBe(true);
      expect(
        await signin(
          Transfer.getHashTxId(transaction.BSAFEScript, chainId),
          'USER_3',
          auth['USER_3'].BSAFEAuth,
          transaction.BSAFETransactionId,
        ),
      ).toBe(true);
      expect(
        await signin(
          Transfer.getHashTxId(transaction.BSAFEScript, chainId),
          'USER_5',
          auth['USER_5'].BSAFEAuth,
          transaction.BSAFETransactionId,
        ),
      ).toBe(false);

      transaction.send();
      const result = await transaction.wait();
      expect(result.status).toBe(TransactionStatus.success);
    },
    100 * 1000,
  );

  test(
    'Created an valid transaction to vault and instance old transaction',
    async () => {
      const vault = await newVault(signers, provider, auth['USER_1'].BSAFEAuth);
      const _assets: ITransferAsset[] = [
        {
          amount: bn(1_000_000).format(),
          assetId: assets['sETH'],
          to: accounts['STORE'].address,
        },
      ];
      let newTransfer: IFormatTransfer = {
        name: 'transfer_assests',
        assets: _assets,
        witnesses: [],
      };
      let transaction = await vault.BSAFEIncludeTransaction(newTransfer);

      const signTimeout = async () => {
        await delay(5000);
        await signin(
          transaction.getHashTxId(),
          'USER_3',
          auth['USER_3'].BSAFEAuth,
          transaction.BSAFETransactionId,
        );

        await delay(5000);
        await signin(
          transaction.getHashTxId(),
          'USER_2',
          auth['USER_2'].BSAFEAuth,
          transaction.BSAFETransactionId,
        );
      };

      newTransfer = {
        assets: _assets,
        name: 'transfer_assests',
        witnesses: [],
      };

      // Create a transaction
      transaction = await vault.BSAFEIncludeTransaction(newTransfer);

      // Signin transaction
      await signin(
        transaction.getHashTxId(),
        'USER_1',
        auth['USER_1'].BSAFEAuth,
        transaction.BSAFETransactionId,
      );

      const oldTransaction = await vault.BSAFEGetTransaction(
        transaction.BSAFETransactionId,
      );

      const pending_requirements = await oldTransaction.send();
      expect(pending_requirements.status).toBe('await_requirements');

      // this process isan`t async, next line is async
      signTimeout();

      const result = await transaction.wait();
      expect(result.status).toBe(TransactionStatus.success);
    },
    100 * 1000,
  );

  test('Instance old transaction', async () => {
    const vault = await newVault(signers, provider, auth['USER_1'].BSAFEAuth);
    const _assetsA = {
      name: 'Transaction A',
      assets: [
        {
          amount: bn(1_000).format(),
          assetId: assets['ETH'],
          to: accounts['STORE'].address,
        },
        {
          amount: bn(1_000).format(),
          assetId: assets['sETH'],
          to: accounts['STORE'].address,
        },
      ],
      witnesses: [],
    };

    // Create a transaction
    const transaction = await vault.BSAFEIncludeTransaction(_assetsA);
    const transaction_aux = await vault.BSAFEGetTransaction(
      transaction.BSAFETransactionId,
    );

    expect(transaction_aux.BSAFETransactionId).toStrictEqual(
      transaction.BSAFETransactionId,
    );
  });

  test('Send an transaction to with vault without balance', async () => {
    const vault = await newVault(signers, provider, auth['USER_1'].BSAFEAuth);
    const _assetsA = {
      name: 'Transaction A',
      assets: [
        {
          amount: bn(1_000_000_000_000_000).format(),
          assetId: assets['ETH'],
          to: accounts['STORE'].address,
        },
        {
          amount: bn(1_000_000_000_000_000).format(),
          assetId: assets['sETH'],
          to: accounts['STORE'].address,
        },
      ],
      witnesses: [],
    };

    const _assetsB = {
      name: '',
      assets: [
        {
          amount: bn(1_000_000_000_000_000).format(),
          assetId: assets['sETH'],
          to: accounts['STORE'].address,
        },
      ],
      witnesses: [],
    };
    // Create a transaction
    await expect(vault.BSAFEIncludeTransaction(_assetsA)).rejects.toThrow(
      /not enough/,
    );
    await expect(vault.BSAFEIncludeTransaction(_assetsB)).rejects.toThrow(
      /not enough/,
    );
  });
  test('Sent a transaction without BSAFEAuth', async () => {
    const VaultPayload: IPayloadVault = {
      configurable: {
        SIGNATURES_COUNT: 3,
        SIGNERS: signers,
        network: provider.url,
        chainId: chainId,
      },
      provider,
    };
    const vault = await Vault.create(VaultPayload);

    await sendPredicateCoins(vault, bn(1_000_000_000), 'sETH', rootWallet);
    await sendPredicateCoins(vault, bn(1_000_000_000), 'ETH', rootWallet);

    const _assetsA = {
      name: 'Transaction A',
      assets: [
        {
          amount: bn(1_000).format(),
          assetId: assets['ETH'],
          to: accounts['STORE'].address,
        },
        {
          amount: bn(1_000).format(),
          assetId: assets['sETH'],
          to: accounts['STORE'].address,
        },
      ],
      witnesses: [],
    };

    const tx = await vault.BSAFEIncludeTransaction(_assetsA);
    tx.BSAFEScript.witnesses = [
      await signin(tx.getHashTxId(), 'USER_1'),
      await signin(tx.getHashTxId(), 'USER_2'),
      await signin(tx.getHashTxId(), 'USER_3'),
    ];

    const result = await tx.send().then(async (tx) => await tx.wait());

    expect(result.status).toBe(TransactionStatus.success);
  });
});
