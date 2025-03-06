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
import { hashTransaction } from 'bakosafe';

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
        const { hex, utxo, hash } = hashTransaction(
          transactionRequest,
          await this.getBaseAssetId(),
        );
        hash_before = hash;
        // @ts-ignore
        utxo_calc = utxo;
        return super.estimateTxDependencies(transactionRequest, params);
      }
    }

    const scriptHash = new DebbugScript(wallet);
    wallet.connect(new CustomProvider(provider.url));

    const call = scriptHash.functions
      .main(await wallet.signMessage(hash_before))
      .txParams({
        gasLimit: bn.parseUnits('100.0'),
        maxFee: bn.parseUnits('1.0'),
      });

    const { callResult } = await call.get();

    const logs = getDecodedLogs(callResult.receipts, DebbugScript.abi);
    // console.log(callResult.receipts[callResult.receipts.length - 2]);
    for (const log of logs) {
      console.log({
        has: hash_before,
        log,
        add: wallet.address.b256Address,
      });
      expect(log).toBe(hash_before);
    }

    return;
  });
});
