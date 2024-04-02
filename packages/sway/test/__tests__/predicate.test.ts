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

import { PredicateAbi__factory } from '../../../sdk/src/sway/predicates';
import { BakoSafe } from '../../../sdk/configurables';

import { PRIVATE_KEY, GAS_LIMIT, GAS_PRICE } from '../constants';

async function seedAccount(
  address: AbstractAddress,
  amount: BN,
  provider: Provider,
) {
  try {
    const genisesWallet = Wallet.fromPrivateKey(PRIVATE_KEY, provider);
    const resp = await genisesWallet.transfer(address, amount, BaseAssetId, {
      gasLimit: Number(GAS_LIMIT),
      gasPrice: Number(GAS_PRICE),
    });
    await resp.waitForResult();
  } catch (e) {
    console.log(e);
    throw e;
  }
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

  // console.log('[SIG]', {
  //   hash,
  //   signature,
  // });

  return signature;
}

async function createTransaction(predicate: Predicate<InputValue[]>) {
  const tx = new ScriptTransactionRequest();
  tx.gasPrice = bn(GAS_LIMIT);
  tx.gasLimit = bn(GAS_LIMIT);
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
      //input.predicateData = arrayify(predicate.predicateData);
    }
  });

  return tx;
}

describe('[SWAY_PREDICATE]', () => {
  let provider: Provider;

  beforeAll(async () => {
    provider = await Provider.create(BakoSafe.get('PROVIDER'));
  });

  test('Send transfer by predicate', async () => {
    const wallet = Wallet.generate({
      provider,
    });
    // to fix this test, resolve dependence conflict on fuels
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

    const tx = await createTransaction(predicate);

    const response = await sendTransaction(provider, tx, [
      await signTransaction(wallet, tx, provider),
    ]);
    const result = await response.waitForResult();

    expect(result.status).toBe('success');
  });
});
