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

import { PRIVATE_KEY, GAS_LIMIT } from '../constants';
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
    throw new Error(e);
  }
}

async function signTransaction(
  wallet: WalletUnlocked,
  tx: TransactionRequest,
  provider: Provider,
) {
  const txHash = tx.getTransactionId(provider.getChainId());
  const hash = txHash.slice(2).toLowerCase();
  const signature = await wallet.signMessage(hash);

  return signature;
}

async function createTransaction(predicate: Predicate<InputValue[]>) {
  try {
    const tx = new ScriptTransactionRequest();
    const provider = predicate.provider;

    tx.gasLimit = bn(GAS_LIMIT);
    tx.maxFee = bn(100000);

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

    return tx;
  } catch (e) {
    throw new Error(e);
  }
}

describe('[SWAY_PREDICATE]', () => {
  let provider: Provider;

  beforeAll(async () => {
    //todo: move to dynamic url of chain and remove of the BakoSafe
    //provider = await Provider.create(BakoSafe.getProviders('CHAIN_URL'));
    provider = await Provider.create('http://127.0.0.1:4000/v1/graphql');
  });

  test('Send transfer by predicate', async () => {
    const wallet = Wallet.generate({
      provider,
    });

    const predicate = PredicateAbi__factory.createInstance(
      provider,
      undefined,
      {
        SIGNATURES_COUNT: 1,
        SIGNERS: [
          wallet.address.toB256(),
          ZeroBytes32,
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

    const response = await sendTransaction(provider, tx, [
      await signTransaction(wallet, tx, provider),
    ]);
    const result = await response.waitForResult();

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
