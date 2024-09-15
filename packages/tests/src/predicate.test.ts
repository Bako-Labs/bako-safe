import { WebAuthn } from './utils';

import {
  BakoError,
  ErrorCodes,
  Vault,
  bakoCoder,
  SignatureType,
} from 'bakosafe';

import { accounts, assets } from './mocks';
import { bn, ReceiptType, WalletUnlocked } from 'fuels';
import { ExampleContract } from './types/sway';
import { ExampleContractFactory } from './types/sway';
import { launchTestNode } from 'fuels/test-utils';

const createTestAsset = (assetId: string) => ({ value: assetId });
const testAssets = [
  createTestAsset(assets['BTC']),
  createTestAsset(assets['DAI']),
  createTestAsset(assets['UNI']),
  createTestAsset(assets['USDC']),
];

describe('[Create]', () => {
  let node: Awaited<ReturnType<typeof launchTestNode>>;

  beforeAll(async () => {
    node = await launchTestNode({
      walletsConfig: {
        count: 3,
        assets: testAssets,
        coinsPerAsset: 1,
        amountPerCoin: 10_000_000_000,
      },
    });
  });

  afterAll(() => {
    node.cleanup();
  });

  it('Should successfully create a Vault instance', async () => {
    const { provider, wallets } = node;

    const [wallet] = wallets;

    // create a vault
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 2,
      SIGNERS: wallets.map((w) => w.address.toB256()),
    });
    await wallet
      .transfer(vault.address.toB256(), bn.parseUnits('0.3'))
      .then((r) => r.waitForResult());

    // get balance
    const balance = (await vault.getBalance()).formatUnits(18);
    expect(0.0).toBeLessThan(Number(balance));
  });

  it('Should reinstantiate the Vault successfully', async () => {
    const { provider, wallets } = node;

    const [wallet] = wallets;

    // create a vault
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 2,
      SIGNERS: wallets.map((w) => w.address.toB256()),
    });

    await wallet
      .transfer(vault.address.toB256(), bn.parseUnits('0.3'))
      .then((r) => r.waitForResult());

    // create a vault again
    const vault2 = new Vault(provider, vault.configurable);

    // compare
    expect(vault.address.toB256()).toBe(vault2.address.toB256());
    expect(vault.configurable).toEqual(vault2.configurable);
    expect(await vault.getBalances()).toEqual(await vault2.getBalances());
  });
});

describe('[Transactions]', () => {
  let node: Awaited<ReturnType<typeof launchTestNode>>;

  beforeAll(async () => {
    node = await launchTestNode({
      walletsConfig: {
        assets: testAssets,
        coinsPerAsset: 1,
        amountPerCoin: 10_000_000_000,
      },
    });
  });

  afterAll(() => {
    node.cleanup();
  });

  it('Should process a simple transaction', async () => {
    const {
      provider,
      wallets: [wallet],
    } = node;
    const address = wallet.address.toB256();

    // create a vault
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [address],
    });
    await wallet
      .transfer(vault.address.toB256(), bn.parseUnits('0.3'))
      .then((r) => r.waitForResult());

    // create a transaction
    const { tx, hashTxId } = await vault.transaction([
      {
        to: address,
        amount: '0.1',
        assetId: provider.getBaseAssetId(),
      },
    ]);
    const signature = await wallet.signMessage(hashTxId);

    // sign
    tx.witnesses = bakoCoder.encode([
      {
        type: SignatureType.Fuel,
        signature: signature,
      },
    ]);

    // send
    const { isStatusSuccess, isTypeScript } = await vault
      .send(tx)
      .then((r) => r.waitForResult());
    expect(isStatusSuccess).toBeTruthy();
    expect(isTypeScript).toBeTruthy();
  });

  it('Should handle transactions with multiple asset IDs', async () => {
    const {
      provider,
      wallets: [genesisWallet],
    } = node;
    const receiverWallet = WalletUnlocked.generate({ provider });

    // create a vault
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [genesisWallet.address.toB256()],
    });

    await genesisWallet
      .transfer(vault.address.toB256(), bn.parseUnits('0.3'))
      .then((r) => r.waitForResult());

    await genesisWallet
      .transfer(vault.address.toB256(), bn.parseUnits('0.3'), assets['BTC'])
      .then((r) => r.waitForResult());

    // create a transaction
    const { tx, hashTxId } = await vault.transaction([
      {
        amount: '0.1',
        assetId: assets['BTC'],
        to: receiverWallet.address.toString(),
      },
      {
        amount: '0.1',
        assetId: provider.getBaseAssetId(),
        to: receiverWallet.address.toString(),
      },
      {
        amount: '0.1',
        assetId: provider.getBaseAssetId(),
        to: receiverWallet.address.toString(),
      },
    ]);

    // sign
    const signature = await genesisWallet.signMessage(hashTxId);
    tx.witnesses = bakoCoder.encode([
      {
        type: SignatureType.Fuel,
        signature,
      },
    ]);

    // send
    const result = await vault.send(tx);
    const { isStatusSuccess } = await result.waitForResult();

    const btcBalance = await receiverWallet.getBalance(assets['BTC']);
    const ethBalance = await receiverWallet.getBalance(
      provider.getBaseAssetId(),
    );

    expect(isStatusSuccess).toBeTruthy();
    expect(btcBalance).toEqual(bn.parseUnits('0.1'));
    expect(ethBalance).toEqual(bn.parseUnits('0.2'));
  });

  it('Should process transaction initiated by ScriptTransactionRequest', async () => {
    const {
      provider,
      wallets: [wallet],
    } = node;

    // deploy a contract
    const contractToDeploy = new ExampleContractFactory(wallet);
    const txDeploy = await contractToDeploy.deploy();
    await txDeploy.waitForResult();

    const { contractId } = txDeploy;

    // create a vault
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [wallet.address.toB256()],
    });
    await wallet
      .transfer(vault.address.toB256(), bn.parseUnits('0.3'))
      .then((r) => r.waitForResult());

    // Get transaction request of contract method
    const contract = new ExampleContract(contractId, vault);

    const contractRequest = await contract.functions
      .seven()
      .getTransactionRequest();

    const { tx, hashTxId } = await vault.BakoTransfer(contractRequest);

    const signature = await wallet.signMessage(hashTxId);
    tx.witnesses = bakoCoder.encode([
      {
        type: SignatureType.Fuel,
        signature: signature,
      },
    ]);

    const result = await vault.send(tx);
    const response = await result.waitForResult();

    expect(response).toHaveProperty('status', 'success');
    expect(response.receipts).toContainEqual(
      expect.objectContaining({
        type: ReceiptType.ReturnData,
        data: '0x0000000000000007',
      }),
    );
  });

  it('Should process transaction initiated by CreateTransactionRequest', async () => {
    const {
      provider,
      wallets: [wallet],
    } = node;

    // create a vault
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [wallet.address.toB256()],
    });
    await wallet
      .transfer(vault.address.toB256(), bn.parseUnits('0.3'))
      .then((r) => r.waitForResult());

    const contract = new ExampleContractFactory(vault);

    const { contractId, transactionRequest } =
      contract.createTransactionRequest();

    const { tx, hashTxId } = await vault.BakoTransfer(transactionRequest);

    const signature = await wallet.signMessage(hashTxId);
    const signatures = bakoCoder.encode([
      {
        type: SignatureType.Fuel,
        signature,
      },
    ]);
    // keep the first signature position
    // because the first signature is the contract creation bytecode
    tx.witnesses?.push(...signatures);

    // send
    const result = await vault.send(tx);
    await result.waitForResult();

    // call this contract
    const deployedContract = new ExampleContract(contractId, wallet);
    const contractRequest = await deployedContract.functions.seven().call();
    const callResponse = await contractRequest.waitForResult();

    // expect
    expect(callResponse.value.toHex()).toEqual('0x7');
  });
});

describe('[Send With]', () => {
  let node: Awaited<ReturnType<typeof launchTestNode>>;

  beforeAll(async () => {
    node = await launchTestNode({
      walletsConfig: {
        assets: testAssets,
        coinsPerAsset: 1,
        amountPerCoin: 10_000_000_000,
      },
    });
  });

  afterAll(() => {
    node.cleanup();
  });

  it('Should process a valid Webauthn signer', async () => {
    const {
      provider,
      wallets: [wallet],
    } = node;

    const webAuthnCredential = WebAuthn.createCredentials();
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [webAuthnCredential.address],
    });
    await wallet
      .transfer(vault.address.toB256(), bn.parseUnits('0.3'))
      .then((r) => r.waitForResult());

    const { tx, hashTxId } = await vault.transaction([
      {
        amount: '0.1',
        assetId: provider.getBaseAssetId(),
        to: wallet.address.toB256(),
      },
    ]);

    tx.witnesses = bakoCoder.encode([
      {
        type: SignatureType.WebAuthn,
        ...(await WebAuthn.signChallenge(webAuthnCredential, hashTxId)),
      },
    ]);

    const result = await vault.send(tx);
    const response = await result.waitForResult();

    expect(response).toHaveProperty('status', 'success');
  });

  it('Should process both Webauthn and fuel signatures', async () => {
    const {
      provider,
      wallets: [wallet],
    } = node;

    const webAuthnCredential = WebAuthn.createCredentials();
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 2,
      SIGNERS: [webAuthnCredential.address, wallet.address.toB256()],
    });
    await wallet
      .transfer(vault.address.toB256(), bn.parseUnits('0.3'))
      .then((r) => r.waitForResult());

    const { tx, hashTxId } = await vault.transaction([
      {
        amount: '0.1',
        assetId: provider.getBaseAssetId(),
        to: wallet.address.toB256(),
      },
    ]);

    tx.witnesses = bakoCoder.encode([
      {
        type: SignatureType.Fuel,
        signature: await wallet.signMessage(hashTxId),
      },
      {
        type: SignatureType.WebAuthn,
        ...(await WebAuthn.signChallenge(webAuthnCredential, hashTxId)),
      },
    ]);

    const result = await vault.send(tx);
    const response = await result.waitForResult();

    expect(response).toHaveProperty('status', 'success');
  });

  it('Should process pending signature correctly', async () => {
    const {
      provider,
      wallets: [wallet],
    } = node;

    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 2,
      SIGNERS: [accounts['USER_1'].address, accounts['USER_2'].address],
    });
    await wallet
      .transfer(vault.address.toB256(), bn.parseUnits('0.3'))
      .then((r) => r.waitForResult());

    const { tx, hashTxId } = await vault.transaction([
      {
        amount: '0.1',
        assetId: provider.getBaseAssetId(),
        to: wallet.address.toB256(),
      },
    ]);

    tx.witnesses = bakoCoder.encode([
      {
        type: SignatureType.Fuel,
        signature: await wallet.signMessage(hashTxId),
      },
    ]);

    await vault.send(tx).catch((e) => {
      const error = BakoError.parse(e);
      expect(error.code).toBe(ErrorCodes.PREDICATE_VALIDATION_FAILED);
    });
  });

  it('Should detect and handle duplicated signatures', async () => {
    const {
      provider,
      wallets: [owner, signer],
    } = node;

    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 2,
      SIGNERS: [owner.address.toB256(), signer.address.toB256()],
    });
    await owner
      .transfer(vault.address.toB256(), bn.parseUnits('0.3'))
      .then((r) => r.waitForResult());

    const { tx, hashTxId } = await vault.transaction([
      {
        amount: '0.1',
        assetId: provider.getBaseAssetId(),
        to: owner.address.toB256(),
      },
    ]);

    const signature = await owner.signMessage(hashTxId);
    tx.witnesses = bakoCoder.encode([
      {
        type: SignatureType.Fuel,
        signature,
      },
      {
        type: SignatureType.Fuel,
        signature,
      },
    ]);

    await vault.send(tx).catch((e) => {
      const error = BakoError.parse(e);
      expect(error.code).toBe(ErrorCodes.PREDICATE_VALIDATION_FAILED);
    });
  });

  it('Should reject invalid Fuel signatures', async () => {
    const {
      provider,
      wallets: [owner, signer],
    } = node;

    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 2,
      SIGNERS: [owner.address.toB256(), signer.address.toB256()],
    });
    await owner
      .transfer(vault.address.toB256(), bn.parseUnits('0.3'))
      .then((r) => r.waitForResult());

    const { tx, hashTxId } = await vault.transaction([
      {
        amount: '0.1',
        assetId: provider.getBaseAssetId(),
        to: owner.address.toB256(),
      },
    ]);

    tx.witnesses = bakoCoder.encode([
      {
        type: SignatureType.Fuel,
        signature: await owner.signMessage(hashTxId),
      },
      {
        type: SignatureType.Fuel,
        signature: '0x',
      },
    ]);

    await vault.send(tx).catch((e) => {
      const error = BakoError.parse(e);
      expect(error.code).toBe(ErrorCodes.PREDICATE_VALIDATION_FAILED);
    });
  });

  it('Should reject invalid WebAuthn signatures', async () => {
    const {
      provider,
      wallets: [wallet],
    } = node;

    const webAuthnCredential = WebAuthn.createCredentials();
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [webAuthnCredential.address],
    });
    await wallet
      .transfer(vault.address.toB256(), bn.parseUnits('0.3'))
      .then((r) => r.waitForResult());

    const { tx, hashTxId } = await vault.transaction([
      {
        amount: '0.1',
        assetId: provider.getBaseAssetId(),
        to: wallet.address.toB256(),
      },
    ]);

    const signature = await WebAuthn.signChallenge(
      webAuthnCredential,
      hashTxId,
    );

    tx.witnesses = bakoCoder.encode([
      {
        type: SignatureType.WebAuthn,
        ...signature,
        signature: signature.signature.slice(0, -3) + '123',
      },
    ]);
  });

  it('Should handle signers located outside of the vault', async () => {
    const {
      provider,
      wallets: [owner, signer],
    } = node;

    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [owner.address.toB256(), signer.address.toB256()],
    });
    await owner
      .transfer(vault.address.toB256(), bn.parseUnits('0.3'))
      .then((r) => r.waitForResult());

    const { tx, hashTxId } = await vault.transaction([
      {
        amount: '0.1',
        assetId: provider.getBaseAssetId(),
        to: owner.address.toB256(),
      },
    ]);

    const signature = await owner.signMessage(hashTxId);
    tx.witnesses = bakoCoder.encode([
      {
        type: SignatureType.Fuel,
        signature,
      },
    ]);

    await vault.send(tx).catch((e) => {
      const error = BakoError.parse(e);
      expect(error.code).toBe(ErrorCodes.PREDICATE_VALIDATION_FAILED);
    });
  });
});
