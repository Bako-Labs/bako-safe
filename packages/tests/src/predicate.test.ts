import { signin, sendCoins, WebAuthn } from './utils';

import {
  BakoError,
  ErrorCodes,
  Vault,
  bakoCoder,
  SignatureType,
} from 'bakosafe/src';

import { networks, accounts, assets } from './mocks';
import { Address, bn, Provider, ReceiptType, Wallet } from 'fuels';
import { ExampleContract } from './types/sway';
import { ExampleContractFactory } from './types/sway';

describe('[Create]', () => {
  let provider: Provider;
  beforeEach(async () => {
    provider = await Provider.create(networks['LOCAL']);
  });

  it('Should successfully create a Vault instance', async () => {
    // create a vault
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 2,
      SIGNERS: [
        accounts['USER_1'].address,
        accounts['USER_2'].address,
        accounts['USER_3'].address,
      ],
    });
    await sendCoins(vault.address.toString(), '0.3', assets['ETH']);

    // get balance
    const balance = (await vault.getBalance(assets['ETH'])).formatUnits(18);
    expect(0.0).toBeLessThan(Number(balance));
  });

  it('Should reinstantiate the Vault successfully', async () => {
    // create a vault
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 2,
      SIGNERS: [
        accounts['USER_1'].address,
        accounts['USER_2'].address,
        accounts['USER_3'].address,
      ],
    });
    await sendCoins(vault.address.toString(), '0.3', assets['ETH']);
    // create a vault again
    const vault2 = new Vault(provider, vault.configurable);
    // compare
    expect(vault.address.toB256()).toBe(vault2.address.toB256());
    expect(vault.configurable).toEqual(vault2.configurable);
    expect(await vault.getBalances()).toEqual(await vault2.getBalances());
  });
});

describe('[Transactions]', () => {
  let provider: Provider;
  beforeEach(async () => {
    provider = await Provider.create(networks['LOCAL']);
  });

  it('Should process a simple transaction', async () => {
    // create a vault
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [accounts['USER_1'].address],
    });
    await sendCoins(vault.address.toString(), '0.2', assets['ETH']);

    // create a transaction
    const { tx, hashTxId } = await vault.transaction([
      {
        amount: '0.1',
        assetId: assets['ETH'],
        to: accounts['USER_1'].address,
      },
    ]);

    // sign
    tx.witnesses = bakoCoder.encode([
      {
        type: SignatureType.Fuel,
        signature: await signin(hashTxId, 'USER_1'),
      },
    ]);

    // send
    const result = await vault.send(tx);
    const response = await result.waitForResult();
    expect(response).toHaveProperty('status', 'success');
  });

  it('Should handle transactions with multiple asset IDs', async () => {
    // create a vault
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [accounts['USER_1'].address],
    });
    const wallet = Wallet.fromAddress(Address.fromRandom(), provider);

    await sendCoins(vault.address.toString(), '0.3', assets['ETH']);
    await sendCoins(vault.address.toString(), '0.3', assets['BTC']);

    // create a transaction
    const { tx, hashTxId } = await vault.transaction([
      {
        amount: '0.1',
        assetId: assets['BTC'],
        to: wallet.address.toString(),
      },
      {
        amount: '0.1',
        assetId: assets['ETH'],
        to: wallet.address.toString(),
      },
      {
        amount: '0.1',
        assetId: assets['ETH'],
        to: wallet.address.toString(),
      },
    ]);

    // sign
    tx.witnesses = bakoCoder.encode([
      {
        type: SignatureType.Fuel,
        signature: await signin(hashTxId, 'USER_1'),
      },
    ]);

    // send
    const result = await vault.send(tx);
    const response = await result.waitForResult();
    const walletBalance = await wallet.getBalances();

    expect(response).toHaveProperty('status', 'success');
    expect(walletBalance.balances).toContainEqual(
      expect.objectContaining({
        assetId: assets['BTC'],
        amount: bn.parseUnits('0.1'),
      }),
    );
    expect(walletBalance.balances).toContainEqual(
      expect.objectContaining({
        assetId: assets['ETH'],
        amount: bn.parseUnits('0.2'),
      }),
    );
  });

  it('Should process transaction initiated by ScriptTransactionRequest', async () => {
    // deploy a contract
    const wallet = Wallet.fromPrivateKey(accounts['FULL'].privateKey, provider);
    const contractToDeploy = new ExampleContractFactory(wallet);
    const txDeploy = await contractToDeploy.deploy();
    await txDeploy.waitForResult();

    const { contractId } = txDeploy;

    // create a vault
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [accounts['USER_1'].address],
    });
    await sendCoins(vault.address.toString(), '0.5', assets['ETH']);

    // Get transaction request of contract method
    const contract = new ExampleContract(contractId, vault);

    const contractRequest = await contract.functions
      .seven()
      .getTransactionRequest();

    const { tx, hashTxId } = await vault.BakoTransfer(contractRequest);

    tx.witnesses = bakoCoder.encode([
      {
        type: SignatureType.Fuel,
        signature: await signin(hashTxId, 'USER_1'),
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
    // create a vault
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [accounts['USER_1'].address],
    });
    await sendCoins(vault.address.toString(), '0.5', assets['ETH']);

    const contract = new ExampleContractFactory(vault);

    const { contractId, transactionRequest } =
      contract.createTransactionRequest();

    const { tx, hashTxId } = await vault.BakoTransfer(transactionRequest);

    const signatures = bakoCoder.encode([
      {
        type: SignatureType.Fuel,
        signature: await signin(hashTxId, 'USER_1'),
      },
    ]);
    // keep the first signature position
    // because the first signature is the contract creation bytecode
    tx.witnesses?.push(...signatures);

    // send
    const result = await vault.send(tx);
    await result.waitForResult();

    // call this contract
    const wallet = Wallet.fromPrivateKey(accounts['FULL'].privateKey, provider);
    const deployedContract = new ExampleContract(contractId, wallet);
    const contractRequest = await deployedContract.functions.seven().call();
    const callResponse = await contractRequest.waitForResult();

    // expect
    expect(callResponse.value.toHex()).toEqual('0x7');
  });
});

describe('[Send With]', () => {
  let provider: Provider;
  beforeEach(async () => {
    provider = await Provider.create(networks['LOCAL']);
  });

  it('Should process a valid Webauthn signer', async () => {
    const webAuthnCredential = WebAuthn.createCredentials();
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [webAuthnCredential.address],
    });
    await sendCoins(vault.address.toString(), '0.3', assets['ETH']);

    const { tx, hashTxId } = await vault.transaction([
      {
        amount: '0.1',
        assetId: assets['ETH'],
        to: accounts['USER_1'].address,
      },
    ]);

    tx.witnesses = bakoCoder.encode([
      {
        type: SignatureType.WebAuthn,
        ...(await WebAuthn.signChallange(webAuthnCredential, hashTxId)),
      },
    ]);

    const result = await vault.send(tx);
    const response = await result.waitForResult();

    expect(response).toHaveProperty('status', 'success');
  });

  it('Should process both Webauthn and fuel signatures', async () => {
    const webAuthnCredential = WebAuthn.createCredentials();
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 2,
      SIGNERS: [webAuthnCredential.address, accounts['USER_1'].address],
    });
    await sendCoins(vault.address.toString(), '0.3', assets['ETH']);

    const { tx, hashTxId } = await vault.transaction([
      {
        amount: '0.1',
        assetId: assets['ETH'],
        to: accounts['USER_1'].address,
      },
    ]);

    tx.witnesses = bakoCoder.encode([
      {
        type: SignatureType.Fuel,
        signature: await signin(hashTxId, 'USER_1'),
      },
      {
        type: SignatureType.WebAuthn,
        ...(await WebAuthn.signChallange(webAuthnCredential, hashTxId)),
      },
    ]);

    const result = await vault.send(tx);
    const response = await result.waitForResult();

    expect(response).toHaveProperty('status', 'success');
  });

  it('Should process pending signature correctly', async () => {
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 2,
      SIGNERS: [accounts['USER_1'].address, accounts['USER_2'].address],
    });
    await sendCoins(vault.address.toString(), '0.3', assets['ETH']);

    const { tx, hashTxId } = await vault.transaction([
      {
        amount: '0.1',
        assetId: assets['ETH'],
        to: accounts['USER_1'].address,
      },
    ]);

    tx.witnesses = bakoCoder.encode([
      {
        type: SignatureType.Fuel,
        signature: await signin(hashTxId, 'USER_1'),
      },
    ]);

    await vault.send(tx).catch((e) => {
      const error = BakoError.parse(e);
      expect(error.code).toBe(ErrorCodes.PREDICATE_VALIDATION_FAILED);
    });
  });

  it('Should detect and handle duplicated signatures', async () => {
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 2,
      SIGNERS: [accounts['USER_1'].address, accounts['USER_2'].address],
    });
    await sendCoins(vault.address.toString(), '0.3', assets['ETH']);

    const { tx, hashTxId } = await vault.transaction([
      {
        amount: '0.1',
        assetId: assets['ETH'],
        to: accounts['USER_1'].address,
      },
    ]);

    const signature = await signin(hashTxId, 'USER_1');
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
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 2,
      SIGNERS: [accounts['USER_1'].address, accounts['USER_2'].address],
    });
    await sendCoins(vault.address.toString(), '0.3', assets['ETH']);

    const { tx, hashTxId } = await vault.transaction([
      {
        amount: '0.1',
        assetId: assets['ETH'],
        to: accounts['USER_1'].address,
      },
    ]);

    tx.witnesses = bakoCoder.encode([
      {
        type: SignatureType.Fuel,
        signature: await signin(hashTxId, 'USER_1'),
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
    const webAuthnCredential = WebAuthn.createCredentials();
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [webAuthnCredential.address],
    });
    await sendCoins(vault.address.toString(), '0.3', assets['ETH']);

    const { tx, hashTxId } = await vault.transaction([
      {
        amount: '0.1',
        assetId: assets['ETH'],
        to: accounts['USER_1'].address,
      },
    ]);

    const signature = await WebAuthn.signChallange(
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
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [accounts['USER_1'].address, accounts['USER_2'].address],
    });
    await sendCoins(vault.address.toString(), '0.3', assets['ETH']);

    const { tx, hashTxId } = await vault.transaction([
      {
        amount: '0.1',
        assetId: assets['ETH'],
        to: accounts['STORE'].address,
      },
    ]);

    const signature = await signin(hashTxId, 'USER_3');

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
