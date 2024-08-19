import {
  Address,
  arrayify,
  bn,
  ContractFactory,
  Provider,
  ReceiptType,
  Wallet,
} from 'fuels';

import {
  signin,
  sendCoins,
  WebAuthn_signChallange,
  WebAuthn_createCredentials,
} from './utils';

import { ContractAbi__factory } from './types/sway';
import { networks, accounts, assets } from './mocks';
import contractBytecode from './types/sway/contracts/ContractAbi.hex';
import {
  BakoError,
  ErrorCodes,
  Vault,
  bakoCoder,
  SignatureType,
} from 'bakosafe/src';

describe('[Create]', () => {
  let provider: Provider;
  beforeEach(async () => {
    provider = await Provider.create(networks['LOCAL']);
  });

  it('Vault', async () => {
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

  it('Instantiated again', async () => {
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

  it('Simple transaction', async () => {
    // create a vault
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [accounts['USER_1'].address],
    });
    await sendCoins(vault.address.toString(), '0.2', assets['ETH']);

    // create a transaction
    const { tx, hashTxId } = await vault.BakoFormatTransfer([
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
    const result = await vault.sendTransactionToChain(tx);
    const response = await result.waitForResult();
    expect(response).toHaveProperty('status', 'success');
  });

  it('With multiple asset ids', async () => {
    // create a vault
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [accounts['USER_1'].address],
    });
    const wallet = Wallet.fromAddress(Address.fromRandom(), provider);

    await sendCoins(vault.address.toString(), '0.3', assets['ETH']);
    await sendCoins(vault.address.toString(), '0.3', assets['BTC']);

    // create a transaction
    const { tx, hashTxId } = await vault.BakoFormatTransfer([
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
    const result = await vault.sendTransactionToChain(tx);
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

  it('Transaction by ScriptTransactionRequest', async () => {
    // deploy a contract to call
    const wallet = Wallet.fromPrivateKey(accounts['FULL'].privateKey, provider);
    const deploy = await ContractAbi__factory.deployContract(
      contractBytecode,
      wallet,
    );
    await deploy.waitForResult();

    // create a vault
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [accounts['USER_1'].address],
    });
    await sendCoins(vault.address.toString(), '0.5', assets['ETH']);

    // Get transaction request of contract method
    const contractAbi = ContractAbi__factory.connect(deploy.contractId, vault);
    const contractMethod = contractAbi.functions.seven();
    const contractRequest = await contractMethod.fundWithRequiredCoins();
    const { tx, hashTxId } = await vault.BakoTransfer(contractRequest);

    tx.witnesses = bakoCoder.encode([
      {
        type: SignatureType.Fuel,
        signature: await signin(hashTxId, 'USER_1'),
      },
    ]);

    const result = await vault.sendTransactionToChain(tx);
    const response = await result.waitForResult();

    expect(response).toHaveProperty('status', 'success');
    expect(response.receipts).toContainEqual(
      expect.objectContaining({
        type: ReceiptType.ReturnData,
        data: '0x0000000000000007',
      }),
    );
  });

  it('Transaction by CreateTransactionRequest', async () => {
    // create a vault
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [accounts['USER_1'].address],
    });
    await sendCoins(vault.address.toString(), '0.5', assets['ETH']);

    const { contractId, transactionRequest } = new ContractFactory(
      arrayify(contractBytecode),
      ContractAbi__factory.abi,
      vault,
    ).createTransactionRequest();

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
    const result = await vault.sendTransactionToChain(tx);
    const response = await result.waitForResult();

    // call this contract
    const wallet = Wallet.fromPrivateKey(accounts['FULL'].privateKey, provider);
    const contractAbi = ContractAbi__factory.connect(contractId, wallet);
    const contractMethod = contractAbi.functions.seven();
    const contractRequest = await contractMethod.fundWithRequiredCoins();

    const callResult = await wallet.sendTransaction(contractRequest);
    const callResponse = await callResult.waitForResult();

    // expect
    expect(response).toHaveProperty('status', 'success');
    expect(callResponse).toHaveProperty('status', 'success');
    expect(callResponse.receipts).toContainEqual(
      expect.objectContaining({
        type: ReceiptType.ReturnData,
        data: '0x0000000000000007',
      }),
    );
  });
});

describe('[Send With]', () => {
  let provider: Provider;
  beforeEach(async () => {
    provider = await Provider.create(networks['LOCAL']);
  });

  it('Webauthn signer', async () => {
    const webAuthnCredential = WebAuthn_createCredentials();
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [webAuthnCredential.address],
    });
    await sendCoins(vault.address.toString(), '0.3', assets['ETH']);

    const { tx, hashTxId } = await vault.BakoFormatTransfer([
      {
        amount: '0.1',
        assetId: assets['ETH'],
        to: accounts['USER_1'].address,
      },
    ]);

    tx.witnesses = bakoCoder.encode([
      {
        type: SignatureType.WebAuthn,
        ...(await WebAuthn_signChallange(webAuthnCredential, hashTxId)),
      },
    ]);

    const result = await vault.sendTransactionToChain(tx);
    const response = await result.waitForResult();

    expect(response).toHaveProperty('status', 'success');
  });

  it('Webauthn and fuel signer', async () => {
    const webAuthnCredential = WebAuthn_createCredentials();
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 2,
      SIGNERS: [webAuthnCredential.address, accounts['USER_1'].address],
    });
    await sendCoins(vault.address.toString(), '0.3', assets['ETH']);

    const { tx, hashTxId } = await vault.BakoFormatTransfer([
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
        ...(await WebAuthn_signChallange(webAuthnCredential, hashTxId)),
      },
    ]);

    const result = await vault.sendTransactionToChain(tx);
    const response = await result.waitForResult();

    expect(response).toHaveProperty('status', 'success');
  });

  it('Pending signature', async () => {
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 2,
      SIGNERS: [accounts['USER_1'].address, accounts['USER_2'].address],
    });
    await sendCoins(vault.address.toString(), '0.3', assets['ETH']);

    const { tx, hashTxId } = await vault.BakoFormatTransfer([
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

    await vault.sendTransactionToChain(tx).catch((e) => {
      const error = BakoError.parse(e);
      expect(error.code).toBe(ErrorCodes.PREDICATE_VALIDATION_FAILED);
    });
  });

  it('Duplicated signature', async () => {
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 2,
      SIGNERS: [accounts['USER_1'].address, accounts['USER_2'].address],
    });
    await sendCoins(vault.address.toString(), '0.3', assets['ETH']);

    const { tx, hashTxId } = await vault.BakoFormatTransfer([
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

    await vault.sendTransactionToChain(tx).catch((e) => {
      const error = BakoError.parse(e);
      expect(error.code).toBe(ErrorCodes.PREDICATE_VALIDATION_FAILED);
    });
  });

  it('Invalid Fuel signature', async () => {
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 2,
      SIGNERS: [accounts['USER_1'].address, accounts['USER_2'].address],
    });
    await sendCoins(vault.address.toString(), '0.3', assets['ETH']);

    const { tx, hashTxId } = await vault.BakoFormatTransfer([
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

    await vault.sendTransactionToChain(tx).catch((e) => {
      const error = BakoError.parse(e);
      expect(error.code).toBe(ErrorCodes.PREDICATE_VALIDATION_FAILED);
    });
  });

  it('Invalid WebAuthn signature', async () => {
    const webAuthnCredential = WebAuthn_createCredentials();
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [webAuthnCredential.address],
    });
    await sendCoins(vault.address.toString(), '0.3', assets['ETH']);

    const { tx, hashTxId } = await vault.BakoFormatTransfer([
      {
        amount: '0.1',
        assetId: assets['ETH'],
        to: accounts['USER_1'].address,
      },
    ]);

    const signature = await WebAuthn_signChallange(
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

  it('Signer outside the vault ', async () => {
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [accounts['USER_1'].address, accounts['USER_2'].address],
    });
    await sendCoins(vault.address.toString(), '0.3', assets['ETH']);

    const { tx, hashTxId } = await vault.BakoFormatTransfer([
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

    await vault.sendTransactionToChain(tx).catch((e) => {
      const error = BakoError.parse(e);
      expect(error.code).toBe(ErrorCodes.PREDICATE_VALIDATION_FAILED);
    });
  });
});
