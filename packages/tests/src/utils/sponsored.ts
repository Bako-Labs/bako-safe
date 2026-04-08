/**
 * Sponsored Transaction Utilities
 *
 * Helper functions para simplificar a criação de transações patrocinadas (gasless).
 *
 * Casos suportados:
 * - Wallet sender + Wallet sponsor
 * - Wallet sender + Vault sponsor
 *
 * Nota: Vault sender requer lógica mais complexa usando vault.transaction(),
 * veja sponsored.test.ts Test 2 para implementação detalhada.
 */

import {
  bn,
  ScriptTransactionRequest,
  WalletUnlocked,
  Provider,
  hexlify,
  calculateGasFee,
  Address,
  type BN,
  type CoinQuantity,
} from 'fuels';
import { Vault } from 'bakosafe';

/**
 * Tipo para representar um asset transfer
 */
export interface AssetTransfer {
  to: string;
  amount: BN;
  assetId: string;
}

/**
 * Tipo para representar o sender (quem envia os tokens)
 */
export type SponsoredSender = WalletUnlocked | Vault;

/**
 * Tipo para representar o sponsor (quem paga o gas)
 */
export type SponsoredSponsor = WalletUnlocked | Vault;

/**
 * Opções para criar uma transação patrocinada
 */
export interface BuildSponsoredTxOptions {
  /** Quem envia os tokens */
  sender: SponsoredSender;
  /** Quem paga o gas */
  sponsor: SponsoredSponsor;
  /** Assets a serem transferidos */
  transfers: AssetTransfer[];
  /** Provider da Fuel Network */
  provider: Provider;
}

/**
 * Resultado da construção de uma transação patrocinada
 */
export interface SponsoredTxResult {
  /** A transação construída */
  tx: ScriptTransactionRequest;
  /** Hash da transação para assinatura */
  txHash: string;
  /** Chain ID */
  chainId: number;
}

/**
 * Opções para assinar uma transação patrocinada
 */
export interface SignSponsoredTxOptions {
  tx: ScriptTransactionRequest;
  txHash: string;
  chainId: number;
  provider: Provider;
  /** Sender e suas wallets de assinatura (se vault, passar os signers) */
  sender: {
    account: SponsoredSender;
    signers?: WalletUnlocked[]; // Necessário se sender for Vault
  };
  /** Sponsor e suas wallets de assinatura (se vault, passar os signers) */
  sponsor: {
    account: SponsoredSponsor;
    signers?: WalletUnlocked[]; // Necessário se sponsor for Vault
  };
}

/**
 * Verifica se é um Vault
 */
export const isVault = (account: SponsoredSender | SponsoredSponsor): account is Vault => {
  return 'encodeSignature' in account;
};

/**
 * Constrói uma transação patrocinada (wallet sender only)
 *
 * Para vault sender, use vault.transaction() + modificações manuais.
 * Veja sponsored.test.ts Test 2 para referência.
 *
 * @param options - Opções de configuração
 * @returns Transação pronta para assinatura
 */
export const buildSponsoredTransaction = async (
  options: BuildSponsoredTxOptions,
): Promise<SponsoredTxResult> => {
  const { sender, sponsor, transfers, provider } = options;
  const baseAssetId = await provider.getBaseAssetId();

  // Coletar assets únicos para buscar recursos do sender
  const senderAssets: CoinQuantity[] = transfers.map((t) => ({
    assetId: t.assetId,
    amount: t.amount,
  }));

  // Buscar recursos
  const senderResources = await sender.getResourcesToSpend(senderAssets);
  const sponsorResources = await sponsor.getResourcesToSpend([
    { assetId: baseAssetId, amount: bn(100_000) },
  ]);

  // Montar transação
  const tx = new ScriptTransactionRequest();

  // Adicionar inputs
  tx.addResources(senderResources);
  tx.addResources(sponsorResources);

  // Se sponsor é vault, popular predicate data
  if (isVault(sponsor)) {
    sponsor.populateTransactionPredicateData(tx);
  }

  // Adicionar outputs de transfer
  for (const transfer of transfers) {
    tx.addCoinOutput(Address.fromB256(transfer.to), transfer.amount, transfer.assetId);
  }

  // Adicionar change outputs
  const senderAssetIds = [...new Set(transfers.map((t) => t.assetId))];
  for (const assetId of senderAssetIds) {
    tx.addChangeOutput(sender.address, assetId);
  }
  tx.addChangeOutput(sponsor.address, baseAssetId);

  // Estimar custos
  const txCost = await provider.getTransactionCost(tx);
  tx.maxFee = txCost.maxFee;
  tx.gasLimit = txCost.gasUsed;

  // Obter hash para assinatura
  const chainId = await provider.getChainId();
  const txHash = tx.getTransactionId(chainId).slice(2);

  return { tx, txHash, chainId };
};

/**
 * Assina e envia uma transação patrocinada
 *
 * Esta função:
 * 1. Coleta assinaturas de todas as partes
 * 2. Estima predicateGasUsed com witnesses reais (se vault sponsor)
 * 3. Ajusta maxFee se necessário
 * 4. Re-assina se o hash mudou
 * 5. Envia a transação
 *
 * @param options - Opções de assinatura
 * @returns Resultado da transação
 */
export const signAndSendSponsored = async (options: SignSponsoredTxOptions) => {
  const { tx, txHash, chainId, provider, sender, sponsor } = options;

  // Função helper para coletar assinaturas
  const collectSignatures = async (hash: string) => {
    const witnesses: string[] = [];

    // Assinatura do sender (wallet only - vault sender não suportado)
    if (!isVault(sender.account)) {
      const sig = await sender.account.signTransaction(tx);
      witnesses.push(sig);
    }

    // Assinatura do sponsor
    if (isVault(sponsor.account)) {
      if (!sponsor.signers || sponsor.signers.length === 0) {
        throw new Error('Sponsor is a Vault but no signers provided');
      }
      for (const signer of sponsor.signers) {
        const sig = await signer.signMessage(hash);
        witnesses.push(sponsor.account.encodeSignature(signer.address.toB256(), sig));
      }
    } else {
      const sig = await sponsor.account.signTransaction(tx);
      witnesses.push(sig);
    }

    return witnesses;
  };

  // Coletar assinaturas iniciais
  tx.witnesses = await collectSignatures(txHash);

  // Estimar predicateGasUsed com witnesses reais (se vault sponsor)
  if (isVault(sponsor.account)) {
    await provider.estimatePredicates(tx);

    // Ajustar maxFee para acomodar predicateGasUsed
    const predicateInput = tx.inputs.find((i: any) => i.predicateData !== undefined) as any;
    if (predicateInput?.predicateGasUsed) {
      const { gasPriceFactor } = await provider.getGasConfig();
      const txCost = await provider.getTransactionCost(tx);
      const predicateFee = calculateGasFee({
        gas: bn(predicateInput.predicateGasUsed),
        priceFactor: gasPriceFactor,
        gasPrice: txCost.gasPrice,
      });
      tx.maxFee = txCost.maxFee.add(predicateFee).mul(14).div(10);

      // Verificar se hash mudou (maxFee faz parte do hash!)
      const finalHash = tx.getTransactionId(chainId);
      if (finalHash !== `0x${txHash}`) {
        // Re-assinar com novo hash
        const newTxHash = finalHash.slice(2);
        tx.witnesses = await collectSignatures(newTxHash);
        // Re-estimar predicateGasUsed com novas assinaturas
        await provider.estimatePredicates(tx);
      }
    }

    // Usar submit de baixo nível para evitar re-estimativas
    const encodedTransaction = hexlify(tx.toTransactionBytes());
    const {
      submit: { id: transactionId },
    } = await provider.operations.submit({ encodedTransaction });

    const txResult = await provider.getTransactionResponse(transactionId);
    return txResult.waitForResult();
  }

  // Enviar transação (wallet sponsor)
  const txResponse = await provider.sendTransaction(tx);
  return txResponse.waitForResult();
};

/**
 * Helper completo: constrói, assina e envia uma transação patrocinada
 *
 * Suporta:
 * - Wallet sender + Wallet sponsor
 * - Wallet sender + Vault sponsor
 *
 * Para Vault sender, use `sendSponsoredFromVault()`.
 *
 * @param options - Todas as opções necessárias
 * @returns Resultado da transação
 */
export const sendSponsored = async (options: {
  sender: {
    account: SponsoredSender;
    signers?: WalletUnlocked[];
  };
  sponsor: {
    account: SponsoredSponsor;
    signers?: WalletUnlocked[];
  };
  transfers: AssetTransfer[];
  provider: Provider;
}) => {
  const { tx, txHash, chainId } = await buildSponsoredTransaction({
    sender: options.sender.account,
    sponsor: options.sponsor.account,
    transfers: options.transfers,
    provider: options.provider,
  });

  return signAndSendSponsored({
    tx,
    txHash,
    chainId,
    provider: options.provider,
    sender: options.sender,
    sponsor: options.sponsor,
  });
};

/**
 * Opções para transação patrocinada de um Vault
 */
export interface SendSponsoredFromVaultOptions {
  /** Vault que envia os tokens */
  vault: Vault;
  /** Signers do vault */
  signers: WalletUnlocked[];
  /** Wallet que paga o gas */
  sponsor: WalletUnlocked;
  /** Assets a serem transferidos */
  transfers: AssetTransfer[];
  /** Provider da Fuel Network */
  provider: Provider;
}

/**
 * Envia uma transação patrocinada de um Vault
 *
 * Este helper lida com toda a complexidade de:
 * 1. Criar tx usando vault.transaction()
 * 2. Substituir o pagador de gas (vault -> sponsor wallet)
 * 3. Estimar fees com FAKE_WITNESSES
 * 4. Coletar assinaturas
 * 5. Enviar via API de baixo nível
 *
 * @param options - Opções de configuração
 * @returns Resultado da transação
 */
export const sendSponsoredFromVault = async (
  options: SendSponsoredFromVaultOptions,
) => {
  const { vault, signers, sponsor, transfers, provider } = options;
  const baseAssetId = await provider.getBaseAssetId();

  // Converter transfers para formato do vault.transaction()
  const assets = transfers.map((t) => ({
    assetId: t.assetId,
    amount: t.amount.format(),
    to: t.to,
  }));

  // PASSO 1: Criar tx usando vault.transaction() (assume vault paga gas)
  const { tx } = await vault.transaction({
    name: 'Sponsored vault transfer',
    assets,
  });

  // PASSO 2: Substituir pagador de gas (vault -> sponsor)
  const vaultBaseAssetInputIndex = tx.inputs.findIndex(
    (i: any) => i.owner === vault.address.toB256() && i.assetId === baseAssetId,
  );

  if (vaultBaseAssetInputIndex >= 0) {
    // Remove input de gas do vault
    tx.inputs.splice(vaultBaseAssetInputIndex, 1);

    // Adiciona input de gas do sponsor
    const sponsorResources = await sponsor.getResourcesToSpend([
      { assetId: baseAssetId, amount: bn(100_000) },
    ]);
    tx.addResources(sponsorResources);

    // Atualiza change output: troco vai para sponsor
    const changeOutputIndex = tx.outputs.findIndex(
      (o: any) => o.type === 2 && o.assetId === baseAssetId,
    );
    if (changeOutputIndex >= 0) {
      (tx.outputs[changeOutputIndex] as any).to = sponsor.address.toB256();
    }
  }

  // PASSO 3: Configurar witnessIndex do sponsor
  const sponsorInputIndex = tx.inputs.findIndex(
    (i: any) => i.owner === sponsor.address.toB256(),
  );
  if (sponsorInputIndex >= 0) {
    (tx.inputs[sponsorInputIndex] as any).witnessIndex = signers.length;
  }

  // PASSO 4: Estimar fees com FAKE_WITNESSES
  const { FAKE_WITNESSES } = await import('bakosafe');
  tx.witnesses = [...Array(signers.length).fill(FAKE_WITNESSES), '0x'];

  const sdkMaxGasUsed = await vault.maxGasUsed();
  const { gasPriceFactor } = await provider.getGasConfig();
  const { maxFee, gasPrice } = await provider.estimateTxGasAndFee({
    transactionRequest: tx,
  });

  const serializedTxCount = bn(tx.toTransactionBytes().length);
  const totalGasUsed = sdkMaxGasUsed.add(serializedTxCount.mul(64));

  const predicateSuccessFeeDiff = calculateGasFee({
    gas: totalGasUsed,
    priceFactor: gasPriceFactor,
    gasPrice,
  });

  tx.maxFee = maxFee.add(predicateSuccessFeeDiff).mul(14).div(10);

  // PASSO 5: Coletar assinaturas
  const chainId = await provider.getChainId();
  const txHash = tx.getTransactionId(chainId).slice(2);

  const vaultSignatures = await Promise.all(
    signers.map(async (signer) => {
      const sig = await signer.signMessage(txHash);
      return vault.encodeSignature(signer.address.toB256(), sig);
    }),
  );
  const sponsorSig = await sponsor.signTransaction(tx);

  // PASSO 6: Definir witnesses reais
  tx.witnesses = [...vaultSignatures, sponsorSig];

  // PASSO 7: Estimar predicateGasUsed com witnesses reais
  await provider.estimatePredicates(tx);

  // PASSO 8: Enviar via API de baixo nível
  const encodedTransaction = hexlify(tx.toTransactionBytes());
  const {
    submit: { id: transactionId },
  } = await provider.operations.submit({ encodedTransaction });

  const txResult = await provider.getTransactionResponse(transactionId);
  return txResult.waitForResult();
};
