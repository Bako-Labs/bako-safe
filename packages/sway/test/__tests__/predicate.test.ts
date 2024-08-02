import { Address, Provider, Wallet, arrayify } from 'fuels';

import { ScriptAbi__factory } from '../../../sdk/src/sway/scripts/';

import { accounts } from '../../../sdk/test/mocks';
import { signin } from '../../../sdk/test/utils/signin';
import {
  createTransactionScript,
  sendTransaction,
  signTransaction,
  CHAIN_URL,
  createPredicate,
  ERROR_DUPLICATED_WITNESSES,
  WEBAUTHN,
} from '../utils';
import { BakoSafe } from '../../../sdk';

describe('[SWAY_PREDICATE] Send transfers', () => {
  let provider: Provider;

  BakoSafe.setProviders({
    CHAIN_URL,
    SERVER_URL: 'http://localhost:3333',
  });

  beforeAll(async () => {
    //todo: move to dynamic url of chain and remove of the BakoSafe
    //provider = await Provider.create(BakoSafe.getProviders('CHAIN_URL'));
    provider = await Provider.create(CHAIN_URL);
  });

  test('By predicate', async () => {
    const predicate = await createPredicate({
      amount: '0.1',
      minSigners: 3,
      signers: [
        accounts['USER_1'].account,
        accounts['USER_3'].account,
        accounts['USER_4'].account,
      ],
    });

    //@ts-ignore
    const tx = await createTransactionScript(predicate);
    tx.script = arrayify(ScriptAbi__factory.bin);
    const id = tx.getTransactionId(provider.getChainId()).slice(2);

    const response = await sendTransaction(provider, tx, [
      ...(await signin(id, 'USER_1', undefined)),
      ...(await signin(id, 'USER_3', undefined)),
      ...(await signin(id, 'USER_4', undefined)),
    ]);
    const result = await response.waitForResult();
    console.log(result.receipts);
    expect(result.status).toBe('success');
  });

  test('With duplicated witnesses', async () => {
    const wallet = Wallet.generate({
      provider,
    });

    const predicate = await createPredicate({
      amount: '0.1',
      minSigners: 2,
      signers: [wallet.address.toB256(), Address.fromRandom().toB256()],
    });

    //@ts-ignore
    const tx = await createTransactionScript(predicate);

    await sendTransaction(provider, tx, [
      await signTransaction(wallet, tx, provider),
      await signTransaction(wallet, tx, provider),
    ]).catch((e) => {
      expect(e.message).toBe(ERROR_DUPLICATED_WITNESSES);
    });
  });

  test('With duplicated signers', async () => {
    const wallet = Wallet.generate({
      provider,
    });

    const predicate = await createPredicate({
      amount: '0.1',
      minSigners: 2,
      signers: [wallet.address.toB256(), wallet.address.toB256()],
    });

    //@ts-ignore
    const tx = await createTransactionScript(predicate);

    await sendTransaction(provider, tx, [
      await signTransaction(wallet, tx, provider),
      await signTransaction(wallet, tx, provider),
    ]).catch((e) => {
      expect(e.message).toBe(ERROR_DUPLICATED_WITNESSES);
    });
  });

  // this test is an adptation, becouse we dont sign messages on node using webauthn
  // add, to validate this, whe have a constants with values signed by webauthn
  // and this transaction, recives a script with this constants and check
  test('By webauthn', async () => {
    const predicate = await createPredicate({
      amount: '0.1',
      minSigners: 1,
      signers: [accounts['USER_1'].account],
    });

    //@ts-ignore
    const tx = await createTransactionScript(predicate);

    tx.script = arrayify(ScriptAbi__factory.bin);

    const id = tx.getTransactionId(provider.getChainId()).slice(2);

    const result = await sendTransaction(provider, tx, [
      ...(await signin(id, 'USER_1', undefined)),
      WEBAUTHN.signature,
    ]);

    const res = await result.waitForResult();
    expect(res.status).toBe('success');

    // verify if on the script, recover of static signature is equal to the static address
    //@ts-ignore
    expect(res.receipts[0]['data']).toBe('0x01');
  });
});
