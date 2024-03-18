import { Provider, TransactionStatus, bn } from 'fuels';
import {
  authService,
  delay,
  IUserAuth,
  newVault,
  rootWallet,
  sendPredicateCoins,
  signin,
} from '../utils';
import { BSafe } from '../../configurables';
import { accounts } from '../mocks';
import { IPayloadVault, Vault } from '../../src/vault';
import { DEFAULT_TRANSACTION_PAYLOAD } from '../mocks/transactions';

describe('[TRANSFERS]', () => {
  let chainId: number;
  let auth: IUserAuth;
  let provider: Provider;
  let signers: string[];

  //example to sett up the provider
  BSafe.setup({
    PROVIDER: 'http://localhost:4000/graphql',
    API_URL: 'http://localhost:3333',
    BSAFE_URL: 'http://localhost:5174',
  });

  beforeAll(async () => {
    provider = await Provider.create(BSafe.get('PROVIDER')!);
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
        auth['USER_1'].BSAFEAuth,
        2,
      );
      const tx = DEFAULT_TRANSACTION_PAYLOAD(accounts['STORE'].address);

      const transaction = await vault.BSAFEIncludeTransaction(tx);

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
        auth['USER_1'].BSAFEAuth,
        2,
      );
      const tx = DEFAULT_TRANSACTION_PAYLOAD(accounts['STORE'].address);

      const transaction = await vault.BSAFEIncludeTransaction(tx);
      expect(
        await signin(
          transaction.getHashTxId(),
          'USER_2',
          auth['USER_2'].BSAFEAuth,
          transaction.BSAFETransactionId,
        ),
      ).toBe(true);
      expect(
        await signin(
          transaction.getHashTxId(),
          'USER_1',
          auth['USER_1'].BSAFEAuth,
          transaction.BSAFETransactionId,
        ),
      ).toBe(true);
      expect(
        await signin(
          transaction.getHashTxId(),
          'USER_3',
          auth['USER_3'].BSAFEAuth,
          transaction.BSAFETransactionId,
        ),
      ).toBe(true);
      expect(
        await signin(
          transaction.getHashTxId(),
          'USER_4',
          auth['USER_4'].BSAFEAuth,
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
    'Instance old transaction',
    async () => {
      const vault = await newVault(
        signers,
        provider,
        auth['USER_1'].BSAFEAuth,
        2,
      );
      const tx = DEFAULT_TRANSACTION_PAYLOAD(accounts['STORE'].address);

      // Create a transaction
      const transaction = await vault.BSAFEIncludeTransaction(tx);
      const transaction_aux = await vault.BSAFEGetTransaction(
        transaction.BSAFETransactionId,
      );
      const transaction_aux_byhash = await vault.BSAFEGetTransaction(
        transaction.getHashTxId(),
      );

      expect(transaction_aux.BSAFETransactionId).toStrictEqual(
        transaction.BSAFETransactionId,
      );
      expect(transaction_aux_byhash.BSAFETransactionId).toStrictEqual(
        transaction.BSAFETransactionId,
      );
    },
    10 * 1000,
  );

  test('Send an transaction to with vault without balance', async () => {
    const vault = await newVault(signers, provider, auth['USER_1'].BSAFEAuth);
    const tx_a = DEFAULT_TRANSACTION_PAYLOAD(accounts['STORE'].address);
    const tx_b = DEFAULT_TRANSACTION_PAYLOAD(accounts['STORE'].address);

    await expect(vault.BSAFEIncludeTransaction(tx_a)).rejects.toThrow(
      /not enough/,
    );
    await expect(vault.BSAFEIncludeTransaction(tx_b)).rejects.toThrow(
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

    const _tx = DEFAULT_TRANSACTION_PAYLOAD(accounts['STORE'].address);

    const tx = await vault.BSAFEIncludeTransaction(_tx);
    tx.BSAFEScript.witnesses = [
      await signin(tx.getHashTxId(), 'USER_1'),
      await signin(tx.getHashTxId(), 'USER_2'),
      await signin(tx.getHashTxId(), 'USER_3'),
    ];

    const result = await tx.send().then(async (tx) => {
      if ('wait' in tx) {
        return await tx.wait();
      }
      return {
        status: TransactionStatus.failure,
      };
    });

    expect(result.status).toBe(TransactionStatus.success);
  });
});
