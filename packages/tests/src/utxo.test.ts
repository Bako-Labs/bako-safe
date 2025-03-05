import { launchTestNode } from 'fuels/test-utils';
import { assets } from './mocks';

import { DebbugScript } from './types/sway/scripts';
import {
  bn,
  getDecodedLogs,
  Provider,
  TransactionRequest,
  type EstimateTxDependenciesParams,
  type EstimateTxDependenciesReturns,
} from 'fuels';
import { hashTransaction } from './utils/transactionHash';

const createTestAsset = (assetId: string) => ({ value: assetId });
const testAssets = [
  createTestAsset(assets['BTC']),
  createTestAsset(assets['DAI']),
  createTestAsset(assets['UNI']),
  createTestAsset(assets['USDC']),
];
describe('Special hash transaction', () => {
  test('Should transfer amount if provide the validator asset_id', async () => {
    const node = await launchTestNode();

    const {
      wallets: [wallet],
      provider,
    } = node;

    let hash_before: string = '';
    let utxo_calc: string = '';

    class CustomProvider extends Provider {
      async estimateTxDependencies(
        transactionRequest: TransactionRequest,
        params?: EstimateTxDependenciesParams,
      ): Promise<EstimateTxDependenciesReturns> {
        const chainId = await this.getChainId();
        const { hex, utxo, hash } = hashTransaction(
          transactionRequest,
          chainId,
          '',
        );
        hash_before = hash;
        // @ts-ignore
        utxo_calc = utxo;
        return super.estimateTxDependencies(transactionRequest, params);
      }
    }

    const scriptHash = new DebbugScript(wallet);
    wallet.connect(new CustomProvider(provider.url));

    const call = await scriptHash.functions.main().txParams({
      gasLimit: bn.parseUnits('100.0'),
      maxFee: bn.parseUnits('1.0'),
    });

    const { callResult } = await call.get();

    const logs = getDecodedLogs(callResult.receipts, DebbugScript.abi);

    console.log('[TX_ID]: ', hash_before);

    for (const log of logs) {
      console.log('-->> Log:', log);
      expect(log).toBe(hash_before);
    }

    return;
  });
});
