import { launchTestNode } from 'fuels/test-utils';
import { assets } from './mocks';

import { DebbugScript } from './types/sway/scripts';
import {
  bn,
  getDecodedLogs,
  hexlify,
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
        const { hex, utxo } = hashTransaction(transactionRequest, chainId, '');
        console.log('utxo: ', utxo);
        hash_before = hex;
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

    console.log('-->> tx_id:', await call.getTransactionId());
    console.log('-->> tx_utxo:', utxo_calc);

    const { callResult } = await call.get();

    const logs = getDecodedLogs(callResult.receipts, DebbugScript.abi);

    for (const log of logs) {
      console.log('-->> Log:', log);
      if (Array.isArray(log)) {
        const logHex = hexlify(Uint8Array.from(log));
        // console.log('-->> Log Hex:', logHex);
        // console.log('-->> Hash Before:', hash_before);

        expect(logHex).toBe(hash_before);
        return;
      }
    }

    return;
  });
});
