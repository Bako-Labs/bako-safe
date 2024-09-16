import { WebAuthn } from '../utils';

import {
  Vault,
  bakoCoder,
  SignatureType,
} from 'bakosafe';

import { assets } from '../mocks';
import {
  bn,
  FuelError,
  getDecodedLogs,
  Provider,
  ProviderOptions,
  ScriptTransactionRequest,
  TransactionCost,
  TransactionCostParams,
  TransactionRequestLike,
} from 'fuels';
import { DebbugScript } from '../types/sway';
import { launchTestNode } from 'fuels/test-utils';
import { execSync } from 'child_process';

if (process.argv.includes('build')) {
  console.log('Building sway...');
  const result = execSync('pnpm sway:build', { stdio: 'pipe' });
  if (result.includes('error')) {
    process.stdout.write(result);
    process.exit(1);
  }
}

const createTestAsset = (assetId: string) => ({ value: assetId });
const testAssets = [
  createTestAsset(assets['BTC']),
  createTestAsset(assets['DAI']),
  createTestAsset(assets['UNI']),
  createTestAsset(assets['USDC']),
];

type ProviderWithInjectorOptions = ProviderOptions & { beforeSendTx?: (tx: ScriptTransactionRequest) => Promise<ScriptTransactionRequest> };

class ProviderWithInjector extends Provider {
  beforeSendTx?: (tx: ScriptTransactionRequest) => Promise<ScriptTransactionRequest>;

  protected constructor(url: string, options: ProviderWithInjectorOptions = {}) {
    super(url, options);
    this.beforeSendTx = options.beforeSendTx;
  }

  static async create(url: string, options: ProviderWithInjectorOptions = {}) {
    const provider = new ProviderWithInjector(url, options);
    await provider.fetchChainAndNodeInfo();
    return provider;
  }

  async getTransactionCost(
      transactionRequestLike: TransactionRequestLike,
      _options: TransactionCostParams = {},
  ): Promise<Omit<TransactionCost, 'requiredQuantities'>> {
    return super.getTransactionCost(transactionRequestLike, {
      signatureCallback: this.beforeSendTx,
    });
  }
}

async function main() {
    const {
      cleanup,
      provider,
      wallets: [wallet],
    } = await launchTestNode({
      walletsConfig: {
        assets: testAssets,
        coinsPerAsset: 1,
        amountPerCoin: 10_000_000_000,
      },
    });
    const testConfig = {
      privateKey: '0xcb76304a3b0004a5152b922e3fc49f269750132a4459e1b56a202a98a1f0bdf8',
      txId: 'a71461d842610656c456edadc6f71aff02e70e1dec41d0e1f2fde941a35ee26d',
      authenticatorData: '0x36c45708f5a4bc7d75960f60ceb5dce0ed43f066f4a7ebe845996195f201d3f66d9acfdf7bd90fea36af279afe21045a0893b6909e31aeedeed0ea3c528b22e4',
      addRandom: false,
    };

    const webAuthnCredential = WebAuthn.createCredentials(testConfig.privateKey);
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [webAuthnCredential.address],
    });

    await wallet
      .transfer(vault.address.toB256(), bn.parseUnits('0.3'))
      .then((r) => r.waitForResult());
   
    const signature = await WebAuthn.signChallenge(webAuthnCredential, testConfig.txId, {
      authenticatorData: testConfig.authenticatorData,
      addRandom: testConfig.addRandom,
    });

    wallet.connect(await ProviderWithInjector.create(provider.url, {
      beforeSendTx: async (tx) => {
        tx.addWitness(bakoCoder.encode({
          type: SignatureType.WebAuthn,
          ...signature,
        }));
        return tx;
      }
    }));

    const script = new DebbugScript(wallet);
    
    try {
      const { value, callResult } = await script
      .functions
      .main(`0x${testConfig.txId}`, vault.configurable as any)
      .get();

      const logs = getDecodedLogs(callResult.receipts, script.interface.jsonAbi);
      console.log(logs);

      if (value) {
          console.log('✅ success');
      } else {
          console.log('❌ failled');
      }
    } catch (e) {
      if (e instanceof FuelError) {
        console.log(e.message);
        console.log(JSON.stringify(e.metadata, null, 2));
      } else {
        throw e;
      }
    }
    

    cleanup();
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

