import { Address, bn, getRandomB256, Provider } from 'fuels';
import { launchTestNode } from 'fuels/test-utils';

import { assets } from './mocks';

import {
  BakoProvider,
  Vault,
  bakoCoder,
  SignatureType,
  ICreateTransactionPayload,
  IPredicatePayload,
  ISignTransactionRequest,
} from 'bakosafe/src';

jest.mock('../../sdk/src/modules/service', () => {
  const actualService = jest.requireActual('../../sdk/src/modules/service');
  const actualProvider = jest.requireActual('../../sdk/src/modules/provider');

  let predicates = new Map();
  let transactions = new Map();

  const mockService = jest.fn().mockImplementation(() => ({
    getWorkspaces: jest
      .fn()
      .mockResolvedValue([
        { workspace: 'mocked_workspace_1' },
        { workspace: 'mocked_workspace_2' },
      ]),

    getToken: jest.fn().mockResolvedValue([
      [assets['ETH'], bn(1)],
      [assets['DAI'], bn(1)],
    ]),

    createPredicate: jest
      .fn()
      .mockImplementation((params: IPredicatePayload) => {
        const { predicateAddress, configurable, provider } = params;
        predicates.set(predicateAddress, { configurable, provider });
        return {
          predicateAddress,
          configurable,
        };
      }),

    findByAddress: jest.fn().mockImplementation((predicateAddress: string) => {
      const { configurable } = predicates.get(predicateAddress);

      return {
        predicateAddress,
        configurable: JSON.parse(configurable),
      };
    }),

    authInfo: jest.fn(),

    createTransaction: jest
      .fn()
      .mockImplementation((params: ICreateTransactionPayload) => {
        const { hash, txData, predicateAddress } = params;
        transactions.set(hash, {
          ...txData,
          witnesses: [],
          predicateAddress,
        });

        return {
          transactionId: hash,
        };
      }),

    findTransactionByHash: jest.fn().mockImplementation((hash: string) => {
      return {
        txData: transactions.get(hash),
      };
    }),

    signTransaction: jest
      .fn()
      .mockImplementation(async (params: ISignTransactionRequest) => {
        const { signature, hash } = params;

        let tx = transactions.get(hash.slice(2));

        tx = {
          ...tx,
          witnesses: [...tx.witnesses, signature],
        };

        const { configurable, provider } = predicates.get(tx.predicateAddress);
        const predicateConfig = JSON.parse(configurable);

        if (tx.witnesses.length >= predicateConfig.SIGNATURES_COUNT) {
          const vault = new Vault(
            await Provider.create(provider),
            predicateConfig,
          );
          await vault.send(tx);
        }
        return true;
      }),

    sendTransaction: jest.fn().mockImplementation(async (hash: string) => {
      let tx = transactions.get(hash.slice(2));

      let { configurable, provider } = predicates.get(tx.predicateAddress);

      if (tx.witnesses.length >= configurable.SIGNATURES_COUNT) {
        const vault = new Vault(
          await Provider.create(provider),
          JSON.parse(configurable),
        );
        await vault.send(tx.txData);
      }
      return true;
    }),
  }));

  // @ts-ignore
  mockService.create = jest
    .fn()
    .mockResolvedValue({ code: 'mocked_challenge' });

  // @ts-ignore
  mockService.sign = jest
    .fn()
    .mockImplementation(async (_: ISignTransactionRequest) => {
      return;
    });

  return {
    Service: mockService,
    TypeUser: actualProvider.TypeUser,
    TransactionStatus: actualService.TransactionStatus,
  };
});

describe('[AUTH]', () => {
  let node: Awaited<ReturnType<typeof launchTestNode>>;

  beforeAll(async () => {
    node = await launchTestNode();
  });

  afterAll(() => {
    node.cleanup();
  });

  it('Should create a instance of bako provider', async () => {
    const {
      provider,
      wallets: [wallet],
    } = node;

    const expectedAuth = {
      address: wallet.address.toB256(),
      token: getRandomB256(),
    };

    const bakoProvider = await BakoProvider.create(provider.url, {
      address: expectedAuth.address,
      token: expectedAuth.token,
    });

    const { address, token } = bakoProvider.options;
    expect(expectedAuth.address).toBe(address);
    expect(expectedAuth.token).toBe(token);
  });

  it('Should authenticate successfully with a valid token', async () => {
    const {
      provider,
      wallets: [wallet],
    } = node;
    const address = wallet.address.toB256();

    const challenge = await BakoProvider.setup({
      provider: provider.url,
      address,
    });

    const token = await wallet.signMessage(challenge);

    const vaultProvider = await BakoProvider.authenticate(provider.url, {
      address,
      challenge,
      token,
    });

    // try an authenticated request
    const tokens = await vaultProvider.service.getToken();

    expect(vaultProvider).toBeDefined();
    expect(vaultProvider.options.address).toBe(address);
    expect(vaultProvider.options.token).toBe(token);
    expect(tokens).toBeDefined();
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('Should retrieve all user workspaces successfully', async () => {
    const {
      provider,
      wallets: [wallet],
    } = node;
    const address = wallet.address.toB256();

    const challenge = await BakoProvider.setup({
      address,
      provider: provider.url,
    });

    const token = await wallet.signMessage(challenge);

    const vaultProvider = await BakoProvider.authenticate(provider.url, {
      address,
      challenge,
      token,
    });

    const workspaces = await vaultProvider.service.getWorkspaces();
    expect(workspaces).toBeDefined();
    expect(workspaces.length).toBeGreaterThanOrEqual(0);
  });

  it('Should retrieve current authentication information', async () => {
    const {
      provider,
      wallets: [wallet],
    } = node;
    const address = wallet.address.toB256();

    const challenge = await BakoProvider.setup({
      address,
      provider: provider.url,
    });

    const token = await wallet.signMessage(challenge);

    const mockVaultProvider = {
      service: {
        authInfo: jest.fn().mockResolvedValue({
          address,
          workspace: 'single-workspace',
          onSingleWorkspace: true,
        }),
      },
    };
    const spyInstance = jest
      .spyOn(BakoProvider, 'authenticate')
      .mockResolvedValue(mockVaultProvider as any);

    const vaultProvider = await BakoProvider.authenticate(provider.url, {
      address,
      challenge,
      token,
    });

    const authInfo = await vaultProvider.service.authInfo();

    expect(authInfo).toBeDefined();
    expect(authInfo.address).toBe(address);
    expect(authInfo.workspace).toBeDefined();
    expect(authInfo.onSingleWorkspace).toBe(true);

    spyInstance.mockRestore();
  });

  it('Should store a vault successfully', async () => {
    const {
      provider,
      wallets: [wallet],
    } = node;
    const address = wallet.address.toB256();

    const challenge = await BakoProvider.setup({
      address,
      provider: provider.url,
    });

    const token = await wallet.signMessage(challenge);

    const vaultProvider = await BakoProvider.authenticate(provider.url, {
      address,
      challenge,
      token,
    });

    const predicate = new Vault(vaultProvider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [address],
      HASH_PREDICATE: Address.fromRandom().toB256(),
    });

    const saved = await predicate.save();

    expect(saved).toBeDefined();
    expect(saved.predicateAddress).toBeDefined();
    expect(saved.predicateAddress.length).toBeGreaterThan(0);
    expect(saved.predicateAddress).toBe(predicate.address.toB256());
  });

  it('Should recover a vault successfully', async () => {
    const {
      provider,
      wallets: [wallet],
    } = node;
    const address = wallet.address.toB256();

    const challenge = await BakoProvider.setup({
      address,
      provider: provider.url,
    });

    const token = await wallet.signMessage(challenge);

    const vaultProvider = await BakoProvider.authenticate(provider.url, {
      address,
      challenge,
      token,
    });

    const predicate = new Vault(vaultProvider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [address],
      HASH_PREDICATE: Address.fromRandom().toB256(),
    });

    const saved = await predicate.save();

    const balanceValue = bn(100);
    const response = await wallet.transfer(
      predicate.address.toB256(),
      balanceValue,
    );
    await response.waitForResult();

    const recover = await Vault.fromAddress(
      saved.predicateAddress,
      vaultProvider,
    );

    const predicateBalance = await predicate.getBalance();
    const recoverBalance = await recover.getBalance();

    // 18 is max of decimals to represent value
    expect(predicate.address.toB256()).toBe(recover.address.toB256());
    expect(predicateBalance.formatUnits(18)).toBe(
      recoverBalance.formatUnits(18),
    );
  });

  it('Should save a transaction to the service', async () => {
    const {
      provider,
      wallets: [wallet],
    } = node;
    const address = wallet.address.toB256();

    const challenge = await BakoProvider.setup({
      address,
      provider: provider.url,
    });

    const token = await wallet.signMessage(challenge);

    const vaultProvider = await BakoProvider.authenticate(provider.url, {
      address,
      challenge,
      token,
    });

    const predicate = new Vault(vaultProvider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [address],
      HASH_PREDICATE: Address.fromRandom().toB256(),
    });

    // how to create a predicate on database on the instance time
    const saved = await predicate.save();

    const balanceValue = '0.3';
    const response = await wallet.transfer(
      predicate.address.toB256(),
      bn.parseUnits(balanceValue),
    );
    await response.waitForResult();

    const recover = await Vault.fromAddress(
      saved.predicateAddress,
      vaultProvider,
    );

    const { hashTxId } = await recover.transaction({
      name: 'Transaction',
      assets: [
        {
          to: Address.fromRandom().toB256(),
          amount: '0.1',
          assetId: provider.getBaseAssetId(),
        },
      ],
    });

    const recoveredTx = await predicate.transactionFromHash(hashTxId);

    expect(recoveredTx).toBeDefined();
    expect(recoveredTx.hashTxId).toBe(hashTxId);
  });

  it('Should sign vault with the provider (1:1 signature)', async () => {
    const {
      provider,
      wallets: [wallet],
    } = node;
    const address = wallet.address.toB256();

    const challenge = await BakoProvider.setup({
      address,
      provider: provider.url,
    });

    const token = await wallet.signMessage(challenge);

    const vaultProvider = await BakoProvider.authenticate(provider.url, {
      address,
      challenge,
      token,
    });

    const predicate = new Vault(vaultProvider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [address],
      HASH_PREDICATE: Address.fromRandom().toB256(),
    });

    // how to create a predicate on database on the instance time
    const saved = await predicate.save();

    const balanceValue = '0.3';
    let response = await wallet.transfer(
      predicate.address.toB256(),
      bn.parseUnits(balanceValue),
    );
    await response.waitForResult();

    const vaultRecover = await Vault.fromAddress(
      saved.predicateAddress,
      vaultProvider,
    );

    const { hashTxId, tx } = await vaultRecover.transaction({
      name: 'Transaction',
      assets: [
        {
          to: Address.fromRandom().toB256(),
          amount: '0.1',
          assetId: provider.getBaseAssetId(),
        },
      ],
    });

    const signature = await wallet.signMessage(hashTxId);
    await vaultProvider.signTransaction({
      hash: `0x${hashTxId}`,
      signature: bakoCoder.encode({
        type: SignatureType.Fuel,
        signature,
      }),
    });

    response = await predicate.send(tx);
    const { isStatusSuccess, isTypeScript } = await response.wait();

    expect(isTypeScript).toBeTruthy();
    expect(isStatusSuccess).toBeTruthy();
  });

  it('Should fail to send transaction before signing', async () => {
    const {
      provider,
      wallets: [wallet],
    } = node;
    const address = wallet.address.toB256();

    const challenge = await BakoProvider.setup({
      address,
      provider: provider.url,
    });

    const token = await wallet.signMessage(challenge);

    const vaultProviderClient1 = await BakoProvider.authenticate(provider.url, {
      address,
      challenge,
      token,
    });

    const predicate = new Vault(vaultProviderClient1, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [address],
      HASH_PREDICATE: Address.fromRandom().toB256(),
    });

    // how to create a predicate on database on the instance time
    const saved = await predicate.save();
    const balanceValue = '0.3';
    let response = await wallet.transfer(
      predicate.address.toB256(),
      bn.parseUnits(balanceValue),
    );
    await response.waitForResult();

    const vaultRecover = await Vault.fromAddress(
      saved.predicateAddress,
      vaultProviderClient1,
    );

    const { hashTxId, tx } = await vaultRecover.transaction({
      name: 'Transaction',
      assets: [
        {
          to: Address.fromRandom().toB256(),
          amount: '0.1',
          assetId: provider.getBaseAssetId(),
        },
      ],
    });

    response = await predicate.send(tx);

    const signature = await wallet.signMessage(hashTxId);
    await vaultProviderClient1.signTransaction({
      hash: `0x${hashTxId}`,
      signature: bakoCoder.encode({
        type: SignatureType.Fuel,
        signature,
      }),
    });

    const res = await response.wait();

    expect(res).toBeDefined();
  });
});
