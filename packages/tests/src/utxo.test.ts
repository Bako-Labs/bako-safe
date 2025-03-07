import { launchTestNode } from 'fuels/test-utils';
import { assets } from './mocks';

import { DebbugScript } from './types/sway/scripts';
import {
  bn,
  getDecodedLogs,
  hashMessage,
  hexlify,
  Provider,
  ScriptTransactionRequest,
  Signer,
  TransactionRequest,
  transactionRequestify,
  type EstimateTxDependenciesParams,
  type EstimateTxDependenciesReturns,
} from 'fuels';
import { hashTransaction, Vault } from 'bakosafe';
import { deployPredicate } from './utils';

const createTestAsset = (assetId: string) => ({ value: assetId });
const testAssets = [
  createTestAsset(assets['BTC']),
  createTestAsset(assets['DAI']),
  createTestAsset(assets['UNI']),
  createTestAsset(assets['USDC']),
];

describe('Special hash transaction', () => {
  let node: Awaited<ReturnType<typeof launchTestNode>>;

  beforeAll(async () => {
    // launch a test node
    node = await launchTestNode({
      walletsConfig: {
        assets: testAssets,
        coinsPerAsset: 1,
        amountPerCoin: 10_000_000_000,
      },
    });

    await deployPredicate(node.wallets[0]);
  });

  afterAll(() => {
    node.cleanup();
  });

  test('Should transfer amount if provide the validator asset_id', async () => {
    const node = await launchTestNode({
      walletsConfig: {
        assets: testAssets,
        coinsPerAsset: 1,
        amountPerCoin: 10_000_000_000,
      },
    });

    const {
      wallets: [wallet],
      provider,
    } = node;

    let hash_before: string = '';
    let utxo_calc: string = '';
    let signature: string = '';
    let _hex: string = '';

    class CustomProvider extends Provider {
      async estimateTxDependencies(
        transactionRequest: TransactionRequest,
        params?: EstimateTxDependenciesParams,
      ): Promise<EstimateTxDependenciesReturns> {
        const { hex, utxo, hash } = hashTransaction(
          transactionRequest,
          await this.getBaseAssetId(),
        );
        hash_before = hash;
        _hex = hex;
        // @ts-ignore
        utxo_calc = utxo;
        // signature = await wallet.signMessage(hash_before);
        // console.log(hash_before);
        return super.estimateTxDependencies(transactionRequest, params);
      }
    }

    const scriptHash = new DebbugScript(wallet);
    wallet.connect(new CustomProvider(provider.url));

    console.log(await wallet.getBalance());

    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [wallet.address.b256Address],
    });

    await wallet
      .transfer(vault.address.toB256(), bn.parseUnits('1.2'))
      .then((tx) => tx.waitForResult());

    const call = await scriptHash.functions.main().getTransactionRequest();

    const { tx, hashTxId } = await vault.BakoTransfer(call);

    tx.witnesses = [await wallet.signMessage(hashTxId)];

    const result = await vault.send(tx);

    const r = await result.waitForResult();

    console.log(r);

    // // await call.estimateAndFund(wallet);

    // // const tx = transactionRequestify(call);

    // // tx.witnesses = [await wallet.signMessage(hash_before)];

    // // const callResult = await (await wallet.sendTransaction(tx)).waitForResult();

    // const logs = getDecodedLogs(callResult.receipts, DebbugScript.abi);
    // console.log(callResult.receipts[callResult.receipts.length - 2]);
    // for (const log of logs) {
    //   if (Array.isArray(log)) {
    //     const logHex = hexlify(Uint8Array.from(log));

    //     console.log(logHex);
    //     expect(logHex).toBe(_hex);
    //   }
    // console.log({
    //   has: hash_before,
    //   log,
    //   add: wallet.address.b256Address,
    // // });
    // expect(log).toBe(_hex);
    // }

    return;
  });
});
