import {
  AbstractAddress,
  Address,
  BN,
  InputType,
  InputValue,
  Predicate,
  Provider,
  ScriptTransactionRequest,
  TransactionRequest,
  TransactionResponse,
  Wallet,
  WalletUnlocked,
  ZeroBytes32,
  arrayify,
  bn,
  hexlify,
} from 'fuels';

import { PredicateAbi__factory } from '../../../sdk/src/sway/predicates';
import { ScriptAbi__factory } from '../../../sdk/src/sway/scripts/';

import { PRIVATE_KEY, GAS_LIMIT, WEBAUTHN, CHAIN_URL } from '../constants';
import { accounts } from '../../../sdk/test/mocks';

const ERROR_DUPLICATED_WITNESSES =
  'FuelError: Invalid transaction data: PredicateVerificationFailed(Panic(PredicateReturnedNonOne))';

async function seedAccount(
  address: AbstractAddress,
  amount: BN,
  provider: Provider,
) {
  try {
    const genisesWallet = Wallet.fromPrivateKey(PRIVATE_KEY, provider);

    const resp = await genisesWallet.transfer(
      address,
      amount,
      provider.getBaseAssetId(),
      {
        gasLimit: Number(GAS_LIMIT),
      },
    );
    await resp.waitForResult();
  } catch (e) {
    throw new Error(e.response.errors[0].message ?? 'Seed Account Error');
  }
}

async function sendTransaction(
  provider: Provider,
  tx: TransactionRequest,
  signatures: Array<string>,
) {
  try {
    tx.witnesses = signatures;
    await provider.estimatePredicates(tx);
    const encodedTransaction = hexlify(tx.toTransactionBytes());
    const {
      submit: { id: transactionId },
    } = await provider.operations.submit({ encodedTransaction });

    const response = new TransactionResponse(transactionId, provider);
    return response;
  } catch (e) {
    console.log(e);
    throw new Error(e);
  }
}

async function signTransaction(
  wallet: WalletUnlocked,
  tx: TransactionRequest,
  provider: Provider,
) {
  const txHash = tx.getTransactionId(provider.getChainId());
  const signature = await wallet.signMessage(txHash);

  return signature;
}

async function createTransaction(predicate: Predicate<InputValue[]>) {
  try {
    const tx = new ScriptTransactionRequest();
    const provider = predicate.provider;

    tx.gasLimit = bn(GAS_LIMIT);
    tx.maxFee = bn(100000000);

    const coins = await predicate.getResourcesToSpend([
      {
        amount: bn(100),
        assetId: provider.getBaseAssetId(),
      },
    ]);
    tx.addResources(coins);

    tx.inputs?.forEach((input) => {
      if (
        input.type === InputType.Coin &&
        hexlify(input.owner) === predicate.address.toB256()
      ) {
        input.predicate = arrayify(predicate.bytes);
      }
    });

    tx.script = arrayify(ScriptAbi__factory.bin);
    return tx;
  } catch (e) {
    console.log(e);
    throw new Error(e);
  }
}

describe('[SWAY_PREDICATE]', () => {
  let provider: Provider;

  beforeAll(async () => {
    //todo: move to dynamic url of chain and remove of the BakoSafe
    //provider = await Provider.create(BakoSafe.getProviders('CHAIN_URL'));
    provider = await Provider.create(CHAIN_URL);
  });

  test('Send transfer by predicate', async () => {
    const predicate = PredicateAbi__factory.createInstance(
      provider,
      undefined,
      {
        SIGNATURES_COUNT: 0,
        SIGNERS: [
          accounts['USER_1'].account,
          accounts['USER_3'].account,
          accounts['USER_4'].account,
          ZeroBytes32,
          ZeroBytes32,
          ZeroBytes32,
          ZeroBytes32,
          ZeroBytes32,
          ZeroBytes32,
          ZeroBytes32,
        ],
        HASH_PREDICATE: Address.fromRandom().toB256(),
      },
    );
    await seedAccount(predicate.address, bn.parseUnits('0.1'), provider);

    const tx = await createTransaction(predicate);
    const id = tx.getTransactionId(await provider.getChainId()).slice(2);

    const response = await sendTransaction(provider, tx, [
      // await signin(id, 'USER_1', undefined),
      // await signin(id, 'USER_3', undefined),
      //await signin(id, 'USER_4', undefined),
      WEBAUTHN.signature,
    ]);
    const result = await response.waitForResult();

    console.log(result.receipts);

    expect(result.status).toBe('success');
  });

  test('Send transfer by predicate with duplicated witnesses', async () => {
    const wallet = Wallet.generate({
      provider,
    });

    const predicate = PredicateAbi__factory.createInstance(
      provider,
      undefined,
      {
        SIGNATURES_COUNT: 2,
        SIGNERS: [
          wallet.address.toB256(),
          Address.fromRandom().toB256(),
          ZeroBytes32,
          ZeroBytes32,
          ZeroBytes32,
          ZeroBytes32,
          ZeroBytes32,
          ZeroBytes32,
          ZeroBytes32,
          ZeroBytes32,
        ],
        HASH_PREDICATE: Address.fromRandom().toB256(),
      },
    );

    await seedAccount(predicate.address, bn.parseUnits('0.1'), provider);

    const tx = await createTransaction(predicate);

    await sendTransaction(provider, tx, [
      await signTransaction(wallet, tx, provider),
      await signTransaction(wallet, tx, provider),
    ]).catch((e) => {
      expect(e.message).toBe(ERROR_DUPLICATED_WITNESSES);
    });
  });

  test('Send transfer by predicate with duplicated signers', async () => {
    const wallet = Wallet.generate({
      provider,
    });

    const predicate = PredicateAbi__factory.createInstance(
      provider,
      undefined,
      {
        SIGNATURES_COUNT: 2,
        SIGNERS: [
          wallet.address.toB256(),
          wallet.address.toB256(),
          ZeroBytes32,
          ZeroBytes32,
          ZeroBytes32,
          ZeroBytes32,
          ZeroBytes32,
          ZeroBytes32,
          ZeroBytes32,
          ZeroBytes32,
        ],
        HASH_PREDICATE: Address.fromRandom().toB256(),
      },
    );

    await seedAccount(predicate.address, bn.parseUnits('0.1'), provider);

    const tx = await createTransaction(predicate);

    await sendTransaction(provider, tx, [
      await signTransaction(wallet, tx, provider),
      await signTransaction(wallet, tx, provider),
    ]).catch((e) => {
      expect(e.message).toBe(ERROR_DUPLICATED_WITNESSES);
    });
  });
});
