import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { launchTestNode } from 'fuels/test-utils';
import { Vault } from 'bakosafe';
import { bn } from 'fuels';
import { ethers } from 'ethers';
import { arrayify } from 'fuels';
import { stringToHex } from 'viem';

const fake_w =
  '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

const recoverTx = (signature: string, hashTxId: string, address: string) => {
  // SOLUÇÃO SIMPLES: Enviar a assinatura EVM diretamente
  // O predicate EVM já está configurado para validar assinaturas da MetaMask
  // Não precisamos codificar nada - apenas enviar a assinatura como witness

  // DEBUG: Verificar se a assinatura está no formato correto
  const r = signature.slice(0, 66);
  const s = signature.slice(66, 130);
  const v = signature.slice(130, 132);

  // Verificar se a assinatura é válida localmente
  const messageHash = ethers.keccak256(
    ethers.toUtf8Bytes(
      `\x19Ethereum Signed Message:\n${hashTxId.length}${hashTxId}`,
    ),
  );

  try {
    const recoveredAddress = ethers.recoverAddress(messageHash, signature);
    console.log('[RECOVER]: ', {
      messageHash,
      signature,
      recoveredAddress,
      address,
      isMatch: recoveredAddress.toLowerCase() === address.toLowerCase(),
    });
  } catch (error) {
    console.error('Error recovering address:', error);
  }
};

describe('[PREDICATE FINAL SOLUTION]', () => {
  let node: Awaited<ReturnType<typeof launchTestNode>>;

  beforeAll(async () => {
    node = await launchTestNode({
      walletsConfig: {
        assets: [
          {
            value:
              '0x0000000000000000000000000000000000000000000000000000000000000000',
          },
        ],
        coinsPerAsset: 1,
        amountPerCoin: 10_000_000_000,
      },
    });
  });

  afterAll(async () => {
    await node.cleanup();
  });

  it('Should process EVM signature with predicate directly', async () => {
    const { provider, wallets } = node;
    const wallet = wallets[0];
    const evmWallet = ethers.Wallet.createRandom();
    const baseAsset = await provider.getBaseAssetId();

    // console.log('[=== STEP 1: Setup ===]', {
    //   address: wallet.address.toB256(),
    //   evmAddress: evmWallet.address,
    //   baseAsset: baseAsset,
    // });

    // Usar a versão EVM específica que você mencionou
    const EVM_VERSION =
      '0xfdac03fc617c264fa6f325fd6f4d2a5470bf44cfbd33bc11efb3bf8b7ee2e938';

    const vault = new Vault(
      provider,
      {
        SIGNER: evmWallet.address,
      },
      EVM_VERSION,
    );

    console.log('[VAULT]: ', {
      vaultAddress: vault.address.toB256(),
      configurable: vault.configurable,
      version: vault.version,
      evmSigner: evmWallet.address,
    });

    await wallet
      .transfer(vault.address.toB256(), bn.parseUnits('0.3'))
      .then(async (r) => await r.waitForResult());

    const { tx, hashTxId } = await vault.transaction({
      name: 'Final Solution Test',
      assets: [
        {
          amount: '0.1',
          assetId: baseAsset,
          to: wallet.address.toB256(),
        },
      ],
    });

    const signature = await evmWallet.signMessage(hashTxId);

    console.log('=== STEP 3: Transaction Creation ===', {
      transactionId: hashTxId,
      signature,
      len: signature.length,
      recover: recoverTx(signature, hashTxId, evmWallet.address),
    });

    // Enviar a assinatura diretamente como witness
    // O predicate EVM sabe como processar assinaturas da MetaMask
    // IMPORTANTE: A assinatura deve estar no índice 1, não no índice 0

    tx.witnesses = [
      fake_w, // Placeholder para o índice 0
      signature,
    ];

    const result = await vault.send(tx);

    const response = await result.waitForResult();

    expect(response).toHaveProperty('status', 'success');
  });
});
