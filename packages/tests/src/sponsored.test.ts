/**
 * Sponsored Transactions Tests
 *
 * Testa transações patrocinadas (gasless) na Fuel Network.
 *
 * CONCEITO:
 * Em uma transação patrocinada, quem envia os fundos (sender) NÃO paga as taxas de gas.
 * Um terceiro (sponsor) fornece o gas, permitindo que usuários sem ETH façam transações.
 *
 * CASOS TESTADOS:
 * 1. Wallet -> Wallet: Sender envia tokens, Sponsor paga gas (ambos wallets simples)
 * 2. Vault -> Wallet: Vault 2/2 envia tokens, Sponsor (wallet) paga gas
 * 3. Wallet -> Vault: Wallet envia tokens, Vault 2/2 paga gas
 *
 * DESCOBERTAS TÉCNICAS:
 * - `predicateGasUsed` NÃO faz parte do hash (pode estimar depois de assinar)
 * - `maxFee` FAZ PARTE do hash (se mudar, deve reassinar!)
 * - `gasLimit` FAZ PARTE do hash (definir antes de assinar)
 * - Predicate BakoSafe ignora witnessIndex e itera todas as witnesses procurando prefixo BAKO
 */

import { bn, Wallet, WalletUnlocked, getRandomB256, Provider } from 'fuels';
import { launchTestNode } from 'fuels/test-utils';
import { Vault } from 'bakosafe';
import { deployPredicate, sendSponsored, sendSponsoredFromVault } from './utils';

describe('[Sponsored Transactions]', () => {
  let node: Awaited<ReturnType<typeof launchTestNode>>;
  let provider: Provider;
  let funder: WalletUnlocked;
  let baseAssetId: string;
  let customAssetId: string;

  const FIXED_HASH = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

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

    await deployPredicate(funder, true);
  });

  afterAll(() => {
    node?.cleanup();
  });

  /**
   * TESTE 1: Wallet -> Wallet com Sponsor
   *
   * Cenário simples: duas wallets, sender tem tokens, sponsor paga gas.
   */
  describe('Wallet -> Wallet (sponsor é uma wallet)', () => {
    it('deve transferir token customizado com sponsor pagando gas', async () => {
      const sender = Wallet.generate({ provider });
      const sponsor = Wallet.generate({ provider });
      const receiver = Wallet.generate({ provider });

      const transferAmount = bn(10_000_000_000);

      // Setup: Sender recebe tokens, Sponsor recebe ETH
      await funder.transfer(sender.address, bn(100_000_000_000), customAssetId).then((r) => r.waitForResult());
      await funder.transfer(sponsor.address, bn(1_000_000_000), baseAssetId).then((r) => r.waitForResult());

      // Enviar transação patrocinada
      const result = await sendSponsored({
        sender: { account: sender },
        sponsor: { account: sponsor },
        transfers: [{ to: receiver.address.toB256(), amount: transferAmount, assetId: customAssetId }],
        provider,
      });

      expect(result.isStatusSuccess).toBe(true);

      // Verificar que receiver recebeu os tokens
      const receiverBalance = await receiver.getBalance(customAssetId);
      expect(receiverBalance.gte(transferAmount)).toBe(true);
    });
  });

  /**
   * TESTE 2: Vault 2/2 -> Wallet com Sponsor externo
   *
   * Vault envia tokens, wallet externa paga o gas.
   */
  describe('Vault envia tokens, Wallet paga gas', () => {
    it('deve transferir token customizado do vault com wallet patrocinando gas', async () => {
      const signer1 = Wallet.generate({ provider });
      const signer2 = node.wallets[1];
      const sponsor = Wallet.generate({ provider });
      const receiver = Wallet.generate({ provider });

      const transferAmount = bn(10_000_000);
      const gasAmount = bn(100_000_000);

      // Criar vault 2/2
      const vault = new Vault(provider, {
        SIGNATURES_COUNT: 2,
        SIGNERS: [signer1.address.toB256(), signer2.address.toB256()],
        HASH_PREDICATE: FIXED_HASH,
      });

      // Setup: Vault recebe tokens E base asset, Sponsor recebe ETH
      await funder.transfer(vault.address, transferAmount, customAssetId).then((r) => r.waitForResult());
      await funder.transfer(vault.address, gasAmount, baseAssetId).then((r) => r.waitForResult());
      await funder.transfer(sponsor.address, gasAmount, baseAssetId).then((r) => r.waitForResult());

      // Enviar transação patrocinada
      const result = await sendSponsoredFromVault({
        vault,
        signers: [signer1, signer2],
        sponsor,
        transfers: [{ to: receiver.address.toB256(), amount: transferAmount, assetId: customAssetId }],
        provider,
      });

      expect(result.isStatusSuccess).toBe(true);

      // Verificar que receiver recebeu os tokens
      const receiverBalance = await receiver.getBalance(customAssetId);
      expect(receiverBalance.gte(transferAmount)).toBe(true);
    });
  });

  /**
   * TESTE 3: Wallet envia tokens, Vault 2/2 paga gas
   *
   * Valida que um Vault 2/2 pode ser o SPONSOR (pagador de gas).
   * Funciona porque o predicate BakoSafe itera todas as witnesses,
   * não apenas a apontada pelo witnessIndex do input.
   */
  describe('Wallet envia tokens, Vault 2/2 paga gas (vault é o sponsor)', () => {
    it('deve transferir token customizado com vault 2/2 patrocinando gas', async () => {
      const sender = Wallet.generate({ provider });
      const sponsorSigner1 = Wallet.generate({ provider });
      const sponsorSigner2 = Wallet.generate({ provider });
      const receiver = Wallet.generate({ provider });

      const transferAmount = bn(10_000_000);
      const gasAmount = bn(100_000_000);

      // Criar vault 2/2 que será o SPONSOR
      const sponsorVault = new Vault(provider, {
        SIGNATURES_COUNT: 2,
        SIGNERS: [sponsorSigner1.address.toB256(), sponsorSigner2.address.toB256()],
        HASH_PREDICATE: FIXED_HASH,
      });

      // Setup: Sender recebe tokens, Vault sponsor recebe ETH
      await funder.transfer(sender.address, transferAmount, customAssetId).then((r) => r.waitForResult());
      await funder.transfer(sponsorVault.address, gasAmount, baseAssetId).then((r) => r.waitForResult());

      // Enviar transação patrocinada
      const result = await sendSponsored({
        sender: { account: sender },
        sponsor: { account: sponsorVault, signers: [sponsorSigner1, sponsorSigner2] },
        transfers: [{ to: receiver.address.toB256(), amount: transferAmount, assetId: customAssetId }],
        provider,
      });

      expect(result.isStatusSuccess).toBe(true);

      // Verificar que receiver recebeu os tokens
      const receiverBalance = await receiver.getBalance(customAssetId);
      expect(receiverBalance.gte(transferAmount)).toBe(true);

      // Verificar que vault sponsor pagou o gas
      const sponsorBalance = await sponsorVault.getBalance(baseAssetId);
      expect(sponsorBalance.lt(gasAmount)).toBe(true);
    });
  });
});
