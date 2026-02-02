/**
 * Sponsored Transactions Tests
 *
 * Este arquivo testa transações patrocinadas (gasless) na Fuel Network.
 *
 * CONCEITO:
 * Em uma transação patrocinada, quem envia os fundos (sender) NÃO paga as taxas de gas.
 * Um terceiro (sponsor) fornece o gas, permitindo que usuários sem ETH façam transações.
 *
 * CASOS TESTADOS:
 * 1. Wallet -> Wallet: Sender envia tokens, Sponsor paga gas (ambos wallets simples)
 * 2. Vault -> Wallet: Vault 2/2 envia tokens, Sponsor (wallet) paga gas
 *
 * DESCOBERTA IMPORTANTE:
 * O `predicateGasUsed` NÃO faz parte do hash da transação.
 * Isso permite: assinar primeiro → estimar predicateGasUsed depois → enviar
 */

import {
  bn,
  ScriptTransactionRequest,
  Wallet,
  WalletUnlocked,
  getRandomB256,
  Provider,
  hexlify,
} from 'fuels';
import { launchTestNode } from 'fuels/test-utils';
import { Vault, FAKE_WITNESSES } from 'bakosafe';
import { deployPredicate } from './utils';

describe('[Sponsored Transactions]', () => {
  let node: Awaited<ReturnType<typeof launchTestNode>>;
  let provider: Provider;
  let funder: WalletUnlocked;
  let signer: WalletUnlocked;
  let baseAssetId: string;
  let customAssetId: string;

  const FIXED_HASH =
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  beforeAll(async () => {
    customAssetId = getRandomB256();

    node = await launchTestNode({
      walletsConfig: {
        count: 2,
        coinsPerAsset: 10,
        amountPerCoin: bn(1_000_000_000_000).toNumber(),
        assets: [{ value: customAssetId }],
      },
    });

    provider = node.provider;
    baseAssetId = await provider.getBaseAssetId();
    funder = node.wallets[0];
    signer = node.wallets[1];

    await deployPredicate(funder, true);
  });

  afterAll(() => {
    node?.cleanup();
  });

  /**
   * TESTE 1: Wallet -> Wallet com Sponsor
   *
   * Cenário simples onde duas wallets participam:
   * - Sender: tem apenas tokens customizados (sem ETH para gas)
   * - Sponsor: tem ETH e paga o gas da transação
   *
   * Estrutura da transação:
   * - inputs[0]: Coin do sender (custom token)
   * - inputs[1]: Coin do sponsor (base asset para gas)
   * - outputs[0]: Transfer para receiver
   * - outputs[1]: Change do custom token para sender
   * - outputs[2]: Change do base asset para sponsor
   *
   * Witnesses:
   * - witnesses[0]: Assinatura do sender
   * - witnesses[1]: Assinatura do sponsor
   */
  describe('Wallet -> Wallet (sponsor is wallet)', () => {
    it('should transfer custom token with sponsor paying gas', async () => {
      const sender = Wallet.generate({ provider });
      const sponsor = Wallet.generate({ provider });
      const receiver = Wallet.generate({ provider });

      const CUSTOM_TOKEN_AMOUNT = bn(100_000_000_000);
      const TRANSFER_AMOUNT = bn(10_000_000_000);

      // Setup: Sender recebe apenas custom tokens (sem ETH)
      await funder
        .transfer(sender.address, CUSTOM_TOKEN_AMOUNT, customAssetId)
        .then((r) => r.waitForResult());

      // Setup: Sponsor recebe ETH para pagar gas
      await funder
        .transfer(sponsor.address, bn(1_000_000_000), baseAssetId)
        .then((r) => r.waitForResult());

      // Buscar recursos de cada participante
      const senderResources = await sender.getResourcesToSpend([
        { assetId: customAssetId, amount: TRANSFER_AMOUNT },
      ]);
      const sponsorResources = await sponsor.getResourcesToSpend([
        { assetId: baseAssetId, amount: bn(100_000) },
      ]);

      // Montar transação manualmente com inputs de ambos
      const request = new ScriptTransactionRequest();
      request.addResources(senderResources); // Input do sender
      request.addResources(sponsorResources); // Input do sponsor (gas)
      request.addCoinOutput(receiver.address, TRANSFER_AMOUNT, customAssetId);
      request.addChangeOutput(sender.address, customAssetId);
      request.addChangeOutput(sponsor.address, baseAssetId);

      // Estimar custos
      const txCost = await provider.getTransactionCost(request);
      request.maxFee = txCost.maxFee;
      request.gasLimit = txCost.gasUsed;

      // Ambos assinam a transação
      const senderSig = await sender.signTransaction(request);
      const sponsorSig = await sponsor.signTransaction(request);
      request.witnesses = [senderSig, sponsorSig];

      const tx = await provider.sendTransaction(request);
      const result = await tx.waitForResult();

      expect(result.isStatusSuccess).toBe(true);
    });
  });

  /**
   * TESTE 2: Vault 2/2 -> Wallet com Sponsor externo
   *
   * Cenário mais complexo onde um Vault BakoSafe envia tokens
   * e uma wallet externa paga o gas.
   *
   * DESAFIO:
   * O vault.transaction() assume que o vault paga o gas.
   * Precisamos modificar a tx para substituir o pagador de gas.
   *
   * FLUXO:
   * 1. Criar tx com vault.transaction() (vault paga gas inicialmente)
   * 2. Remover input de gas do vault
   * 3. Adicionar input de gas do sponsor
   * 4. Ajustar change output para sponsor
   * 5. Calcular maxFee com FAKE_WITNESSES
   * 6. Obter hash e assinar (predicateGasUsed NÃO faz parte do hash!)
   * 7. Definir witnesses reais
   * 8. Estimar predicateGasUsed com witnesses reais
   * 9. Enviar
   *
   * ESTRUTURA FINAL:
   * - inputs[0]: Coin do vault (custom token) - predicate input
   * - inputs[1]: Coin do sponsor (base asset) - wallet input
   *
   * - witnesses[0]: Assinatura signer1 (formato BAKO)
   * - witnesses[1]: Assinatura signer2 (formato BAKO)
   * - witnesses[2]: Assinatura sponsor (formato Fuel padrão)
   */
  describe('Vault transfer with Wallet paying gas', () => {
    it('should transfer custom token from vault with wallet sponsoring gas', async () => {
      const sponsor = Wallet.generate({ provider }); // Wallet que paga gas
      const signer2 = Wallet.generate({ provider }); // Segundo assinante do vault
      const receiver = Wallet.generate({ provider });
      const transferAmount = bn(10_000_000);
      const gasAmount = bn(100_000_000);

      // Criar vault 2/2 (requer 2 assinaturas)
      const vault = new Vault(provider, {
        SIGNATURES_COUNT: 2,
        SIGNERS: [signer2.address.toB256(), signer.address.toB256()],
        HASH_PREDICATE: FIXED_HASH,
      });

      // Setup: Vault precisa ter custom tokens E base asset
      // (vault.transaction() requer base asset para estimar fees inicialmente)
      await funder
        .transfer(vault.address, transferAmount, customAssetId)
        .then((r) => r.waitForResult());

      await funder
        .transfer(vault.address, gasAmount, baseAssetId)
        .then((r) => r.waitForResult());

      // Setup: Sponsor recebe ETH para pagar gas
      await funder
        .transfer(sponsor.address, gasAmount, baseAssetId)
        .then((r) => r.waitForResult());

      console.log('=== Setup complete ===');

      // ============================================================
      // PASSO 1: Criar transação usando o padrão do SDK
      // O SDK monta a tx assumindo que o vault paga o gas
      // ============================================================
      const { tx, hashTxId: originalHashTxId } = await vault.transaction({
        name: 'Sponsored vault transfer',
        assets: [
          {
            assetId: customAssetId,
            amount: transferAmount.format(),
            to: receiver.address.toB256(),
          },
        ],
      });

      console.log('=== After vault.transaction() ===');
      console.log('Original hashTxId:', originalHashTxId);

      // ============================================================
      // PASSO 2: Substituir o pagador de gas (vault -> sponsor)
      // Removemos o input de base asset do vault e adicionamos do sponsor
      // ============================================================
      const vaultBaseAssetInputIndex = tx.inputs.findIndex(
        (i: any) =>
          i.owner === vault.address.toB256() && i.assetId === baseAssetId,
      );

      if (vaultBaseAssetInputIndex >= 0) {
        // Remove input de gas do vault
        tx.inputs.splice(vaultBaseAssetInputIndex, 1);

        // Adiciona input de gas do sponsor
        const sponsorResources = await sponsor.getResourcesToSpend([
          { assetId: baseAssetId, amount: bn(100_000) },
        ]);
        tx.addResources(sponsorResources);

        // Atualiza change output: troco de gas vai para sponsor, não vault
        const changeOutputIndex = tx.outputs.findIndex(
          (o: any) => o.type === 2 && o.assetId === baseAssetId,
        );
        if (changeOutputIndex >= 0) {
          (tx.outputs[changeOutputIndex] as any).to = sponsor.address.toB256();
        }
      }

      // ============================================================
      // PASSO 3: Configurar witnessIndex do sponsor
      // O input do sponsor deve apontar para sua witness (índice 2)
      // ============================================================
      const sponsorInputIndex = tx.inputs.findIndex(
        (i: any) => i.owner === sponsor.address.toB256(),
      );
      if (sponsorInputIndex >= 0) {
        (tx.inputs[sponsorInputIndex] as any).witnessIndex = 2;
      }

      console.log('=== After replacing gas payer ===');

      // ============================================================
      // PASSO 4: Calcular maxFee com FAKE_WITNESSES
      // Usamos FAKE_WITNESSES para estimar o fee antes de ter as assinaturas reais
      // ============================================================
      tx.witnesses = [FAKE_WITNESSES, FAKE_WITNESSES, '0x'];

      const sdkMaxGasUsed = await vault.maxGasUsed();
      const { gasPriceFactor } = await provider.getGasConfig();
      const { maxFee, gasPrice } = await provider.estimateTxGasAndFee({
        transactionRequest: tx,
      });

      // Calcular fee incluindo gas do predicate (similar ao SDK)
      const serializedTxCount = bn(tx.toTransactionBytes().length);
      const totalGasUsed = sdkMaxGasUsed.add(serializedTxCount.mul(64));

      const { calculateGasFee } = await import('fuels');
      const predicateSuccessFeeDiff = calculateGasFee({
        gas: totalGasUsed,
        priceFactor: gasPriceFactor,
        gasPrice,
      });

      // Multiplier 1.4x para margem de segurança
      tx.maxFee = maxFee.add(predicateSuccessFeeDiff).mul(14).div(10);
      console.log('Calculated maxFee:', tx.maxFee.toString());

      // ============================================================
      // PASSO 5: Obter hash para assinatura
      // IMPORTANTE: predicateGasUsed NÃO faz parte do hash!
      // Isso permite estimar o gas depois de assinar
      // ============================================================
      const chainId = await provider.getChainId();
      const newHashTxId = tx.getTransactionId(chainId).slice(2);
      console.log('New hashTxId:', newHashTxId);

      // ============================================================
      // PASSO 6: Coletar assinaturas
      // - Signers do vault: signMessage(hash) - assinam o hash da tx
      // - Sponsor: signTransaction(tx) - assina a transação completa
      // ============================================================
      const signer2Sig = await signer2.signMessage(newHashTxId);
      const signerSig = await signer.signMessage(newHashTxId);
      const sponsorSig = await sponsor.signTransaction(tx);

      // ============================================================
      // PASSO 7: Definir witnesses REAIS
      // - [0]: Assinatura signer2 codificada no formato BAKO
      // - [1]: Assinatura signer1 codificada no formato BAKO
      // - [2]: Assinatura do sponsor (formato Fuel padrão)
      // ============================================================
      tx.witnesses = [
        vault.encodeSignature(signer2.address.toB256(), signer2Sig),
        vault.encodeSignature(signer.address.toB256(), signerSig),
        sponsorSig,
      ];

      // ============================================================
      // PASSO 8: Estimar predicateGasUsed com witnesses REAIS
      // Este é o passo crucial! O estimatePredicates() calcula o gas
      // real que o predicate vai consumir baseado nas witnesses atuais.
      //
      // Com FAKE_WITNESSES: ~2.700 gas
      // Com witnesses reais: ~58.510 gas (21x maior!)
      //
      // Isso funciona porque predicateGasUsed NÃO faz parte do hash,
      // então podemos calculá-lo DEPOIS de assinar.
      // ============================================================
      await provider.estimatePredicates(tx);

      const vaultInputFinal = tx.inputs.find(
        (i: any) => i.predicateData !== undefined,
      ) as any;
      console.log(
        'predicateGasUsed after estimatePredicates with real witnesses:',
        vaultInputFinal?.predicateGasUsed?.toString(),
      );

      console.log('=== Sending ===');

      // ============================================================
      // PASSO 9: Enviar transação
      // Usamos a API de baixo nível para evitar re-estimativas automáticas
      // ============================================================
      const encodedTransaction = hexlify(tx.toTransactionBytes());
      const {
        submit: { id: transactionId },
      } = await provider.operations.submit({ encodedTransaction });

      const txResult = await provider.getTransactionResponse(transactionId);
      const result = await txResult.waitForResult();

      expect(result.isStatusSuccess).toBe(true);

      // Verificar que o receiver recebeu os tokens
      const receiverBalance = await receiver.getBalance(customAssetId);
      console.log('Receiver got:', receiverBalance.toString());
      expect(receiverBalance.gte(transferAmount)).toBe(true);
    });
  });
});
