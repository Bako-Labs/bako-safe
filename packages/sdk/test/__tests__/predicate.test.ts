import { Provider } from 'fuels';
import { signin, newVault, IUserAuth, authService } from '../utils';
import { IPayloadVault, Vault } from '../../src/modules';
import { BakoSafe } from '../../configurables';
import {
  DEFAULT_BALANCES,
  accounts,
  DEFAULT_TRANSACTION_PAYLOAD,
} from '../mocks';

describe('[PREDICATES]', () => {
  let auth: IUserAuth;
  let provider: Provider;
  let signers: string[];

  beforeAll(async () => {
    provider = await Provider.create(BakoSafe.getProviders('CHAIN_URL'));
    auth = await authService(
      ['USER_1', 'USER_2', 'USER_3', 'USER_5', 'USER_4'],
      provider.url,
    );
    signers = [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
      accounts['USER_3'].address,
    ];
  }, 20 * 1000);

  test('Create an inválid vault', async () => {
    const VaultPayload: IPayloadVault = {
      configurable: {
        HASH_PREDICATE: undefined,
        SIGNATURES_COUNT: 3,
        SIGNERS: signers,
        network: provider.url,
      },
      BakoSafeAuth: auth['USER_1'].BakoSafeAuth,
    };

    await expect(
      Vault.create({ ...VaultPayload, version: 'fake_version' }),
    ).rejects.toThrow('Invalid predicate version');

    VaultPayload.configurable.SIGNATURES_COUNT = 0;

    await expect(Vault.create(VaultPayload)).rejects.toThrow(
      'SIGNATURES_COUNT is required must be granter than zero',
    );

    VaultPayload.configurable.SIGNATURES_COUNT = 3;
    VaultPayload.configurable.SIGNERS = [];
    await expect(Vault.create(VaultPayload)).rejects.toThrow(
      'SIGNERS must be greater than zero',
    );

    VaultPayload.configurable.SIGNERS = signers;
    VaultPayload.configurable.SIGNATURES_COUNT = 5;

    await expect(Vault.create(VaultPayload)).rejects.toThrow(
      'Required Signers must be less than signers',
    );
  });

  test('Created an valid vault', async () => {
    const vault = await newVault(
      signers,
      provider,
      auth['USER_1'].BakoSafeAuth,
    );
    expect(await vault.getBalances()).toStrictEqual(DEFAULT_BALANCES);
  });

  test('Create vault with predicate version', async () => {
    const currentVersion = await Vault.BakoSafeGetCurrentPredicateVersion();
    const { data: versions } = await Vault.BakoSafeGetPredicateVersions();
    const _versions = versions.filter(
      (version) => version.code !== currentVersion.code,
    );
    const vaultVersion = _versions[0].code;
    const VaultPayload: IPayloadVault = {
      configurable: {
        HASH_PREDICATE: undefined,
        SIGNATURES_COUNT: 3,
        SIGNERS: signers,
        network: provider.url,
      },
      BakoSafeAuth: auth['USER_1'].BakoSafeAuth,
      version: vaultVersion,
    };
    const vault = await Vault.create(VaultPayload);

    expect(vault.version).not.toEqual(currentVersion.code);
  });

  test('Create vault without predicate version', async () => {
    const VaultPayload: IPayloadVault = {
      configurable: {
        HASH_PREDICATE: undefined,
        SIGNATURES_COUNT: 3,
        SIGNERS: signers,
        network: provider.url,
      },
      BakoSafeAuth: auth['USER_1'].BakoSafeAuth,
    };
    const vault = await Vault.create(VaultPayload);
    const currentVersion = await Vault.BakoSafeGetCurrentPredicateVersion();

    expect(vault.version).toEqual(currentVersion.code);
  });

  test(
    'Instance an old Vault by BakoSafe Predicate ID',
    async () => {
      const vault = await newVault(
        signers,
        provider,
        auth['USER_1'].BakoSafeAuth,
      );
      const auxVault = await Vault.create({
        ...auth['USER_1'].BakoSafeAuth,
        id: vault.BakoSafeVaultId,
      });
      expect(auxVault.BakoSafeVaultId).toStrictEqual(vault.BakoSafeVaultId);
      expect(auxVault.BakoSafeVault.id).toStrictEqual(vault.BakoSafeVaultId);
    },
    20 * 1000,
  );

  test(
    'Instance an old Vault by predicate address',
    async () => {
      const vault = await newVault(
        signers,
        provider,
        auth['USER_1'].BakoSafeAuth,
      );
      const auxVault = await Vault.create({
        ...auth['USER_1'].BakoSafeAuth,
        predicateAddress: vault.address.toString(),
      });
      expect(auxVault.BakoSafeVaultId).toStrictEqual(vault.BakoSafeVaultId);
    },
    10 * 1000,
  );

  test(
    'Instance an old Vault by payload',
    async () => {
      const vault = await newVault(
        signers,
        provider,
        auth['USER_1'].BakoSafeAuth,
      );

      const vaultByPayload = await Vault.create({
        configurable: JSON.parse(vault.BakoSafeVault.configurable),
      });

      const [vaultAddress, vaultByPayloadAddress] = [
        vault.address.toString(),
        vaultByPayload.address.toString(),
      ];

      expect(vaultAddress).toEqual(vaultByPayloadAddress);
    },
    10 * 1000,
  );

  test(
    'Find a transactions of predicate and return an list of Transfer instances',
    async () => {
      const vault = await newVault(
        signers,
        provider,
        auth['USER_1'].BakoSafeAuth,
        5,
      );
      const tx_1 = DEFAULT_TRANSACTION_PAYLOAD(accounts['STORE'].address);
      const tx_2 = DEFAULT_TRANSACTION_PAYLOAD(accounts['STORE'].address);

      const transaction = await vault.BakoSafeIncludeTransaction(tx_1);
      await vault.BakoSafeIncludeTransaction(tx_2);

      await signin(
        transaction.getHashTxId(),
        'USER_2',
        auth['USER_2'].BakoSafeAuth,
        transaction.BakoSafeTransactionId,
      );

      //default pagination
      const transactions = await vault.BakoSafeGetTransactions();
      expect(transactions.data.length).toBe(2);
      expect(transactions.currentPage).toBe(0);
      expect(transactions.perPage).toBe(10);

      //custom pagination
      const perPage = 1;
      const page = 1;
      const ptransations = await vault.BakoSafeGetTransactions({
        perPage,
        page,
      });
      expect(ptransations.currentPage).toBe(page);
      expect(ptransations.perPage).toBe(perPage);
      expect(ptransations.data.length).toBe(1);
    },
    100 * 1000,
  );

  test('Call an method of vault depends of auth without credentials', async () => {
    const vault = await newVault(signers, provider);

    await expect(vault.getConfigurable().SIGNATURES_COUNT).toBe(3);
    await expect(vault.BakoSafeGetTransactions()).rejects.toThrow(
      'Auth is required',
    );
  });

  test('Find current predicate version', async () => {
    const currentVersion = await Vault.BakoSafeGetCurrentPredicateVersion();

    expect(currentVersion).toHaveProperty('id');
    expect(currentVersion).toHaveProperty('name');
    expect(currentVersion).toHaveProperty('description');
    expect(currentVersion).toHaveProperty('code');
    expect(currentVersion).toHaveProperty('abi');
    expect(currentVersion).toHaveProperty('bytes');
    expect(currentVersion).toHaveProperty('active');
  });

  test('Find current predicate version by code', async () => {
    const code =
      '0x379cc51194ba4c6288b1dae9cfe7e758a95d268cf5525c3ffb6b0c3bef941872';
    const predicateVersion =
      await Vault.BakoSafeGetPredicateVersionByCode(code);

    expect(predicateVersion).toHaveProperty('id');
    expect(predicateVersion).toHaveProperty('name');
    expect(predicateVersion).toHaveProperty('description');
    expect(predicateVersion).toHaveProperty('code', code);
    expect(predicateVersion).toHaveProperty('abi');
    expect(predicateVersion).toHaveProperty('bytes');
    expect(predicateVersion).toHaveProperty('active');
  });

  test('List predicate versions with pagination', async () => {
    const page = 1;
    const perPage = 8;
    const paginatedVersions = await Vault.BakoSafeGetPredicateVersions({
      page,
      perPage,
    });

    expect(paginatedVersions).toHaveProperty('data');
    expect(paginatedVersions).toHaveProperty('total');
    expect(paginatedVersions.data.length).toBeLessThanOrEqual(perPage);
    expect(paginatedVersions).toHaveProperty('currentPage', page);
    expect(paginatedVersions).toHaveProperty('perPage', perPage);
  });
});
