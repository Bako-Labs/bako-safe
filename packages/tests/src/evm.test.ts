import { assets } from './mocks';
import { launchTestNode } from 'fuels/test-utils';
import { deployPredicate } from './utils';
import { DebbugScript } from './types/sway/scripts/DebbugScript';
import { ethers, Signature, hashMessage } from 'ethers';
import { Address, hexlify, transactionRequestify } from 'fuels';
import { splitSignature } from '@ethersproject/bytes';
import { hexToBytes } from '@ethereumjs/util';

const createTestAsset = (assetId: string) => ({ value: assetId });
const testAssets = [
  createTestAsset(assets['BTC']),
  createTestAsset(assets['DAI']),
  createTestAsset(assets['UNI']),
  createTestAsset(assets['USDC']),
];
describe('[Create]', () => {
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

  it('sign message with evm wallet', async () => {
    const {
      wallets: [wallet],
    } = node;
    // Assinatura recebida
    // const signature =
    //   '0xef37670776ee1df81abb26d3d7571b8bb05bf4b577db906c0a27346625e9b46e9074614569180ceb07ce803a05dec522bf3a234db76a1ae4fcbe5f10d71aff82';
    const evmWallet = ethers.Wallet.createRandom();
    const address = new Address(evmWallet.address).toString();

    console.log('Address:', address);

    const script = new DebbugScript(wallet);
    const transactionRequest = script.functions.main(0, address);
    const txId = await transactionRequest.getTransactionId();
    console.log(`Transaction ID: ${txId}`);

    // transactionRequest.setArguments(0);
    // const message = hashMessage(txId.slice(2));

    const s = await evmWallet.signMessage(txId);

    const si = Signature.from(s);

    const sig = si.compactSerialized;

    const recover = ethers.verifyMessage(txId, sig);

    let request = await transactionRequest.getTransactionRequest();

    const prefixedMessage = `\x19Ethereum Signed Message:\n${txId.length.toString()}${txId}`;

    console.log('Prefixed:', {
      len: hexlify(ethers.toUtf8Bytes(txId.length.toString())),
      hash: hexlify(ethers.toUtf8Bytes(txId)),
      prefix: hexlify(ethers.toUtf8Bytes('\x19Ethereum Signed Message:\n')),
      completo: hexlify(ethers.toUtf8Bytes(prefixedMessage)),
    });

    const hashOfMessage = ethers.keccak256(ethers.toUtf8Bytes(prefixedMessage));

    console.log('message: ', {
      // message,
      recover,
      message: ethers.hashMessage(txId),
      txId,
      address,
      sig,
      hashOfMessage,
    });

    request.witnesses = [sig];

    //0x37abb2895faa2390d5ff6175bcfae8ce5eacada3f71d44dacb7aee10c7d6ffb2cc99fca0f6628bd3dce1ac432ce3668b5d8db714cc0fcd7422f99ddf590bcbe2;

    request = await request.estimateAndFund(wallet);

    const result = await wallet.sendTransaction(request);
    const { logs } = await result.wait();

    // console.log('Rest:', rest);
    console.log('Logs:', logs);

    // console.log('Transaction:', as);

    // const callResult = await wallet.call(tx);

    // // const signature = await wallet.signMessage('Hello, Ethereum!');

    // console.log({
    //   value,
    //   callResult,
    // });

    // [wallet]
    // 0x6577b417230132a47d2e31afca936cc7efd7a4fb243e27cd377c3f0e96c465fb;
    //0xef37670776ee1df81abb26d3d7571b8bb05bf4b577db906c0a27346625e9b46e9074614569180ceb07ce803a05dec522bf3a234db76a1ae4fcbe5f10d71aff82
  });
});
