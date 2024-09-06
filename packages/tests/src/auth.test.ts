import { Address, Wallet } from 'fuels';

import { accounts, assets, networks } from './mocks';
import {
  BakoProvider,
  Vault,
  bakoCoder,
  SignatureType,
} from '../../sdk/src/modules/';
import { sendCoins, signin } from './utils';

// User auth resources:
//    - auth -> ok (fuel, webauthn?)
//    - get workspaces -> ok
//    - create workspace -> ?
//    - get userInfo -> ok
//    - vault store -> ok
//    - vault recover -> ok
//    - tx store -> ok
//    - tx recover -> ok
//    - tx sign -> ok
//    - tx send -> ok
//    - tx wait -> ok

// type returned data of services

describe('[AUTH]', () => {
  it('Should authenticate with a token', async () => {
    const address = accounts['USER_1'].account;

    const challenge = await BakoProvider.setup({
      address,
    });

    const token = await Wallet.fromPrivateKey(
      accounts['USER_1'].privateKey,
    ).signMessage(challenge);

    const vaultProvider = await BakoProvider.create(networks['LOCAL'], {
      address,
      challenge,
      token,
    });

    // try an authenticated request
    const tokens = await vaultProvider.service.getToken();

    expect(vaultProvider).toBeDefined();
    expect(vaultProvider.options.address).toBe(address);
    expect(vaultProvider.options.token).toBe(token);
    expect(vaultProvider.options.challenge).toBe(challenge);
    expect(tokens).toBeDefined();
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('Should find my workspaces', async () => {
    const address = accounts['USER_1'].account;

    const challenge = await BakoProvider.setup({
      address,
    });

    const token = await Wallet.fromPrivateKey(
      accounts['USER_1'].privateKey,
    ).signMessage(challenge);

    const vaultProvider = await BakoProvider.create(networks['LOCAL'], {
      address,
      challenge,
      token,
    });

    const workspaces = await vaultProvider.service.getWorkspaces();
    expect(workspaces).toBeDefined();
    expect(workspaces.length).toBeGreaterThanOrEqual(0);
  });

  it('Should get infos of current auth', async () => {
    const address = accounts['USER_1'].account;

    const challenge = await BakoProvider.setup({
      address,
    });

    const token = await Wallet.fromPrivateKey(
      accounts['USER_1'].privateKey,
    ).signMessage(challenge);

    const vaultProvider = await BakoProvider.create(networks['LOCAL'], {
      address,
      challenge,
      token,
    });

    const authInfo = await vaultProvider.service.authInfo();

    expect(authInfo).toBeDefined();
    expect(authInfo.address).toBe(address);
    expect(authInfo.workspace).toBeDefined();
    expect(authInfo.onSingleWorkspace).toBe(true);
  });

  it('Should store a vault', async () => {
    const address = accounts['USER_1'].account;

    const challenge = await BakoProvider.setup({
      address,
    });

    const token = await Wallet.fromPrivateKey(
      accounts['USER_1'].privateKey,
    ).signMessage(challenge);

    const vaultProvider = await BakoProvider.create(networks['LOCAL'], {
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

  it('Should recover a vault', async () => {
    const address = accounts['USER_1'].account;

    const challenge = await BakoProvider.setup({
      address,
    });

    const token = await Wallet.fromPrivateKey(
      accounts['USER_1'].privateKey,
    ).signMessage(challenge);

    const vaultProvider = await BakoProvider.create(networks['LOCAL'], {
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

    const balanceValue = '0.1';
    await sendCoins(predicate.address.toB256(), balanceValue, assets['ETH']);

    const recover = await Vault.fromAddress(
      saved.predicateAddress,
      vaultProvider,
    );

    const predicateBalance = await predicate.getBalance(assets['ETH']);
    const recoverBalance = await recover.getBalance(assets['ETH']);

    // 18 is max of decimals to represent value
    expect(predicate.address.toB256()).toBe(recover.address.toB256());
    expect(predicateBalance.formatUnits(18)).toBe(
      recoverBalance.formatUnits(18),
    );
  });

  it('Should save a transaction', async () => {
    const address = accounts['USER_1'].account;

    const challenge = await BakoProvider.setup({
      address,
    });

    const token = await Wallet.fromPrivateKey(
      accounts['USER_1'].privateKey,
    ).signMessage(challenge);

    const vaultProvider = await BakoProvider.create(networks['LOCAL'], {
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
    await sendCoins(predicate.address.toB256(), balanceValue, assets['ETH']);

    const recover = await Vault.fromAddress(
      saved.predicateAddress,
      vaultProvider,
    );

    const { hashTxId } = await recover.transaction([
      {
        to: Address.fromRandom().toB256(),
        amount: '0.1',
        assetId: assets['ETH'],
      },
    ]);

    const recoveredTx = await predicate.transactionFromHash(hashTxId);

    expect(recoveredTx).toBeDefined();
    expect(recoveredTx.hashTxId).toBe(hashTxId);
  });

  it('Should sign vault 1:1 with provider', async () => {
    const address = accounts['USER_1'].account;

    const challenge = await BakoProvider.setup({
      address,
    });

    const token = await Wallet.fromPrivateKey(
      accounts['USER_1'].privateKey,
    ).signMessage(challenge);

    const vaultProvider = await BakoProvider.create(networks['LOCAL'], {
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
    await sendCoins(predicate.address.toB256(), balanceValue, assets['ETH']);

    const vaultRecover = await Vault.fromAddress(
      saved.predicateAddress,
      vaultProvider,
    );

    const { hashTxId, tx } = await vaultRecover.transaction([
      {
        to: Address.fromRandom().toB256(),
        amount: '0.1',
        assetId: assets['ETH'],
      },
    ]);

    await vaultProvider.signTransaction({
      hash: `0x${hashTxId}`,
      signature: bakoCoder.encode([
        {
          type: SignatureType.Fuel,
          signature: await signin(hashTxId, 'USER_1'),
        },
      ])[0],
    });

    const response = await predicate.send(tx);
    const res = await response.wait();

    expect(res).toBeDefined();
  });

  it.only('Should try send before sign transaction', async () => {
    const address = accounts['USER_1'].account;

    const challenge = await BakoProvider.setup({
      address,
    });

    const token = await Wallet.fromPrivateKey(
      accounts['USER_1'].privateKey,
    ).signMessage(challenge);

    const vaultProviderClient1 = await BakoProvider.create(networks['LOCAL'], {
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
    await sendCoins(predicate.address.toB256(), balanceValue, assets['ETH']);

    const vaultRecover = await Vault.fromAddress(
      saved.predicateAddress,
      vaultProviderClient1,
    );

    const { hashTxId, tx } = await vaultRecover.transaction([
      {
        to: Address.fromRandom().toB256(),
        amount: '0.1',
        assetId: assets['ETH'],
      },
    ]);

    const response = await predicate.send(tx);

    await vaultProviderClient1.signTransaction({
      hash: `0x${hashTxId}`,
      signature: bakoCoder.encode([
        {
          type: SignatureType.Fuel,
          signature: await signin(hashTxId, 'USER_1'),
        },
      ])[0],
    });

    const res = await response.wait();

    expect(res).toBeDefined();
  }, 10000);
});
