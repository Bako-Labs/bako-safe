import { launchTestNode } from 'fuels/test-utils';
import { assets } from './mocks';
import {
  ExampleContract,
  ExampleContractFactory,
} from './types/sway/contracts';

import { DebbugScript } from './types/sway/scripts';
import {
  arrayify,
  BigNumberCoder,
  bn,
  concat,
  getDecodedLogs,
  hexlify,
  InputType,
  OutputType,
  ScriptTransactionRequest,
  sha256,
  TransactionRequest,
  transactionRequestify,
  TransactionRequestInput,
  TransactionRequestOutput,
  TransactionType,
  ZeroBytes32,
} from 'fuels';

const createTestAsset = (assetId: string) => ({ value: assetId });
const testAssets = [
  createTestAsset(assets['BTC']),
  createTestAsset(assets['DAI']),
  createTestAsset(assets['UNI']),
  createTestAsset(assets['USDC']),
];

// hash_structure

/**
 * // utxo
 *   - asset_id -> predicate_id_atual, contract_id
 *   - utxo -> tx_id, output_index
 *
 *
 * // transaction
 *  - tx_type
 *  - inputscount
 *  - outputscount
 *
 *  - tx_script -> hash(bytecode)
 *
 *  - inputs
 *  - outputs
 *  -
 *
 */

const format_output = (outputs: TransactionRequestOutput[]) => {
  let _payload = concat([]);

  outputs.map((output) => {
    switch (output.type) {
      case OutputType.Coin:
        _payload = concat([
          new BigNumberCoder('u64').encode(output.type),
          new BigNumberCoder('u64').encode(output.amount),
          output.assetId,
          output.to,
        ]);
        break;
      case OutputType.Change:
        _payload = concat([
          new BigNumberCoder('u64').encode(output.type),
          output.assetId,
          output.to,
        ]);
        break;
      case OutputType.Contract:
        _payload = concat([
          new BigNumberCoder('u64').encode(output.type),
          new BigNumberCoder('u64').encode(output.inputIndex),
        ]);
        break;
    }
  });

  return sha256(_payload);
};

const format_input = (inputs: TransactionRequestInput[]) => {
  let _payload = concat([]);

  inputs.map((input) => {
    switch (input.type) {
      case InputType.Coin:
        _payload = concat([
          new BigNumberCoder('u64').encode(input.type),
          new BigNumberCoder('u64').encode(input.amount),
          input.assetId,
          input.owner,
        ]);
        break;
      case InputType.Message:
        _payload = concat([
          new BigNumberCoder('u64').encode(input.type),
          new BigNumberCoder('u64').encode(input.amount),
          input.sender,
          input.recipient,
        ]);
        break;
      case InputType.Contract:
        _payload = concat([
          new BigNumberCoder('u64').encode(input.type),
          input.contractId,
        ]);
        break;
    }
  });

  return sha256(_payload);
};

const custom_tx_hash = (tx: TransactionRequest) => {
  const script =
    tx.type === TransactionType.Script ? sha256(tx.script) : ZeroBytes32;
  let payload = concat([
    new BigNumberCoder('u64').encode(tx.type),
    new BigNumberCoder('u64').encode(tx.inputs.length),
    new BigNumberCoder('u64').encode(tx.outputs.length),
  ]);

  // console.log('[TX_HEADER]', sha256(payload));

  payload = concat([
    payload,
    script, // sha256
    format_output(tx.outputs), // sha256
    format_input(tx.inputs), // sha256
    // add utxo output
  ]);

  return sha256(payload);
};

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
    const tx = await waitForResult();

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

    // console.log(
    //   '[TX_CUSTOM_HASH]',
    //   custom_tx_hash(await __tx.getTransactionRequest()),
    // );

    console.log(
      '[TX_SCRIPT_BYTECODE_HASH]',
      hexlify((await __tx.getTransactionRequest()).script),
    );

    const as = new ScriptTransactionRequest();
    as.script = script.bytes;
    as.gasLimit = bn.parseUnits('0.001');
    as.maxFee = bn.parseUnits('0.001');

    const coins = await wallet.getResourcesToSpend([
      {
        assetId: assets['ETH'],
        amount: 0.5,
      },
    ]);
    //0xc7b24839470d8982641778bb50422a067b7b3566136afaaab968a642ddc81a3a
    //0xc7b24839470d8982641778bb50422a067b7b3566136afaaab968a642ddc81a3a;
    as.addResources(coins);

    // console.log(
    //   '[TX_HASH]',
    //   (await (await wallet.sendTransaction(as)).waitForResult()).receipts,
    // );

    // const a = script.functions.main();
    // const res = await (await a.call()).waitForResult();
    const res = await (await wallet.sendTransaction(as)).waitForResult();

    // const logs = getDecodedLogs(
    //   res.transactionResult.receipts,
    //   script.interface.jsonAbi,
    // );

    // console.log('[SCRIPT_LOGS]', logs);
    console.log(
      '[RECEIPTS]',
      res.receipts.filter((r) => r.type === 6),
    );
    // faca um sha256 do script
    // no sway -> recorte com o operador mcp
    // no sway -> use o conteudo de mcp para fazer o hash
    console.log('[TX_SCRIPT_HASH]', {
      hash_script: sha256(hexlify(as.script)),
      hash_scriptdata: sha256(hexlify(as.scriptData)),
      hash_policy: sha256(as.maxFee.toBytes()),
      hash: hexlify(as.toTransactionBytes()),
    });

    const _tx = await __tx.call();
    const minted = await _tx.waitForResult();
  });
});
