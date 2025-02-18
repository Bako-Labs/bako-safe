import { launchTestNode } from 'fuels/test-utils';
import { assets } from './mocks';
import {
  ExampleContract,
  ExampleContractFactory,
} from './types/sway/contracts';

import { DebbugScript } from './types/sway/scripts';
import { getDecodedLogs, transactionRequestify, ZeroBytes32 } from 'fuels';

const createTestAsset = (assetId: string) => ({ value: assetId });
const testAssets = [
  createTestAsset(assets['BTC']),
  createTestAsset(assets['DAI']),
  createTestAsset(assets['UNI']),
  createTestAsset(assets['USDC']),
];

describe('[Transactions]', () => {
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

    // deploy a predicate
    const [wallet] = node.wallets;
  });

  afterAll(() => {
    node.cleanup();
  });

  it('Should process transaction initiated by CreateTransactionRequest', async () => {
    const {
      provider,
      wallets: [wallet],
    } = node;

    const { contractId, waitForResult } = await new ExampleContractFactory(
      wallet,
    ).deploy();

    // console.log('[contract]: ', await wallet.getBalances());

    const tx = await waitForResult();

    // console.log('[contract_deploy]: ', tx);

    const contract = new ExampleContract(contractId, wallet);
    const __tx = await contract.functions.mint(
      {
        Address: {
          bits: wallet.address.toB256(),
        },
      },
      ZeroBytes32,
      100,
    );

    const script = new DebbugScript(wallet);

    // console.log(script.interface);

    const a = await script.functions.main().call();
    const res = await a.waitForResult();

    const logs = getDecodedLogs(
      res.transactionResult.receipts,
      script.interface.jsonAbi,
    );

    console.log(logs);

    console.log('[TX_ID]', res.transactionId);

    // console.log('[contract_call]: ', callResult);

    // console.log(
    //   '-----[contract_mint]: ',
    //   JSON.stringify(await __tx.getTransactionRequest()),
    // );

    const _tx = await __tx.call();

    const minted = await _tx.waitForResult();

    // console.log(
    //   '-----[contract_mint]: ',
    //   JSON.stringify(minted.transactionResult),
    // );

    // console.log('[contract_mint]: ', minted.transactionResult.mintedAssets);

    // console.log(
    //   '[contract_balances]: ',
    //   minted.transactionResult.receipts.filter((l) => l.type === 6),
    // );
    // log é type 6

    // call this contract
    // const deployedContract = new ExampleContract(contractId, wallet);
    // const contractRequest = await deployedContract.functions.seven().call();
    // const callResponse = await contractRequest.waitForResult();

    // console.log('[contract_call]: ', callResponse);
  });
});
