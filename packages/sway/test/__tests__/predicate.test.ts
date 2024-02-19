import {
  Address,
  BaseAssetId,
  hashMessage,
  InputValue,
  Predicate,
  Provider,
  Wallet,
  WalletUnlocked,
  Signer,
  bn,
} from 'fuels';
import { PredicateAbi__factory } from '../../../sdk/src/predicates';
const { PROVIDER, PRIVATE_KEY, GAS_PRICE, GAS_LIMIT } = process.env;

describe('[PREDICATE]', () => {
  let provider: Provider;
  let wallet: WalletUnlocked;
  let predicate: Predicate<InputValue[]>;

  beforeAll(async () => {
    console.log(PROVIDER, PRIVATE_KEY, GAS_PRICE, GAS_LIMIT);
    provider = await Provider.create(PROVIDER!);
    wallet = await Wallet.fromPrivateKey(PRIVATE_KEY!, provider);

    predicate = PredicateAbi__factory.createInstance(provider, {
      HASH_PREDICATE: [
        // todo: fix to use a salt
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      ],
      SIGNATURES_COUNT: 1,
      //@ts-ignore
      SIGNERS: [
        wallet.address.toHexString(),
        ...Array.from({ length: 9 }, () => Address.fromRandom().toHexString()),
      ],
    });
    console.log(predicate);
    //send coins to predicate
    const w_tx = await wallet.transfer(
      predicate.address,
      bn.parseUnits('0.5'),
      BaseAssetId,
      {
        gasPrice: Number(GAS_PRICE),
        gasLimit: Number(GAS_LIMIT),
      },
    );
    console.log(await w_tx.wait());
  });

  test('Send a valid transaction ', async () => {
    const tx = await predicate.createTransfer(
      Address.fromRandom(),
      bn.parseUnits('0.01'),
      BaseAssetId,
      {
        gasPrice: Number(GAS_PRICE),
        gasLimit: Number(GAS_LIMIT),
      },
    );

    const tx_id = tx.getTransactionId(provider.getChainId());
    const sig = await wallet.signMessage(tx_id);
    console.log(Signer.recoverAddress(hashMessage(tx_id), sig), wallet.address);

    tx.witnesses = [sig];
    tx.witnessLimit = bn.parseUnits(tx.witnesses.length.toString());

    console.log('->', tx.witnesses);
    const res = await provider.sendTransaction(tx);
    console.log(res);
  });
});
