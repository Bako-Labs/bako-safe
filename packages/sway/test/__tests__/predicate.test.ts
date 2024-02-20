import {
  AbstractAddress,
  Address,
  BN,
  BaseAssetId,
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

import { PredicateAbi__factory } from '../../../sdk/src/predicates';

const { PROVIDER } = process.env;

async function seedAccount(
  address: AbstractAddress,
  amount: BN,
  provider: Provider,
) {
  const genisesWallet = Wallet.fromPrivateKey(
    '0xa449b1ffee0e2205fa924c6740cc48b3b473aa28587df6dab12abc245d1f5298',
    provider,
  );
  const resp = await genisesWallet.transfer(address, amount, BaseAssetId, {
    gasLimit: 100_000,
    gasPrice: 1,
  });
  await resp.waitForResult();
}

async function sendTransaction(
  provider: Provider,
  tx: TransactionRequest,
  signatures: Array<string>,
) {
  tx.witnesses = signatures;
  await provider.estimatePredicates(tx);
  const encodedTransaction = hexlify(tx.toTransactionBytes());
  const {
    submit: { id: transactionId },
  } = await provider.operations.submit({ encodedTransaction });

  const response = new TransactionResponse(transactionId, provider);
  return response;
}

async function signTransaction(
  wallet: WalletUnlocked,
  tx: TransactionRequest,
  provider: Provider,
) {
  const txHash = tx.getTransactionId(provider.getChainId());
  const hash = txHash.slice(2).toLowerCase();
  const signature = await wallet.signMessage(hash);

  console.log('[SIG]', {
    hash,
    signature,
  });

  return signature;
}

async function createTransaction(predicate: Predicate<InputValue[]>) {
  const tx = new ScriptTransactionRequest();
  tx.gasPrice = bn(1);
  tx.gasLimit = bn(100_001);
  const coins = await predicate.getResourcesToSpend([
    {
      amount: bn(100),
      assetId: BaseAssetId,
    },
  ]);
  tx.addResources(coins);

  // Add predicate data to the input
  tx.inputs?.forEach((input) => {
    if (
      input.type === InputType.Coin &&
      hexlify(input.owner) === predicate.address.toB256()
    ) {
      // eslint-disable-next-line no-param-reassign
      input.predicate = arrayify(predicate.bytes);
      // eslint-disable-next-line no-param-reassign
      input.predicateData = arrayify(predicate.predicateData);
    }
  });

  return tx;
}

describe('Test Predicate', () => {
  let provider: Provider;
  let chainId: number;

  beforeAll(async () => {
    provider = await Provider.create(PROVIDER!);
    chainId = provider.getChainId();
  });

  test('Send transfer using predicate', async () => {
    const wallet = Wallet.generate({
      provider,
    });
    const predicate = PredicateAbi__factory.createInstance(provider, {
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
    });
    await seedAccount(predicate.address, bn.parseUnits('0.1'), provider);

    // Add signatures
    console.log('Create transaction');

    const tx = await createTransaction(predicate);

    const response = await sendTransaction(provider, tx, [
      await signTransaction(wallet, tx, provider),
    ]);
    const result = await response.waitForResult();
    console.log(result.status);

    expect(result.status).toBe('success');
  });
});
