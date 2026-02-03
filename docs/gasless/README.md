# Gasless/Sponsored Transactions - Feature Tracker

Acompanhamento do desenvolvimento de transações patrocinadas (gasless) no BakoSafe.

## Status Geral

| Fase | Status | Descrição |
|------|--------|-----------|
| 1. Proof of Concept | ✅ Concluído | Testes validando cenários de sponsored tx |
| 2. SDK Integration | 🔄 Em progresso | Métodos helper no SDK |
| 3. Gasless API | ⏳ Pendente | Serviço de relay |
| 4. Sponsor Predicate | ⏳ Pendente | Predicate Sway para pool |
| 5. Owner Policy | ⏳ Aguardando | Depende de fuel-core v0.47+ |

---

## Fase 1: Proof of Concept ✅

### Cenários Validados

| # | Cenário | Arquivo | Status |
|---|---------|---------|--------|
| 1 | Wallet envia, Wallet patrocina | `sponsored.test.ts` | ✅ |
| 2 | Vault 2/2 envia, Wallet patrocina | `sponsored.test.ts` | ✅ |
| 3 | Wallet envia, Vault 2/2 patrocina | `sponsored.test.ts` | ✅ |

### Descobertas Técnicas

#### O que FAZ parte do hash da transação:
- `maxFee` ← **Se mudar após assinar, deve reassinar!**
- `gasLimit`
- `inputs` (incluindo witnessIndex)
- `outputs`
- `script/scriptData`

#### O que NÃO faz parte do hash:
- `predicateGasUsed` ← Pode estimar depois de assinar
- `witnesses`

#### Comportamento do Predicate BakoSafe:
- Ignora `witnessIndex` do input
- Itera por TODAS as witnesses procurando prefixo BAKO
- Permite múltiplas assinaturas para mesmo input (Vault 2/2 como sponsor)

### Arquivos Relevantes
- Testes: `packages/tests/src/sponsored.test.ts`
- Contexto: `context/gasless-fuel-planning.md` (repo bakosafe-context)

---

## Fase 2: SDK Integration 🔄

### Objetivo
Simplificar o uso de transações patrocinadas com métodos helper no SDK.

### API Proposta

```typescript
// Opção 1: Método no Vault
const result = await vault.sendSponsored({
  sponsor: sponsorWallet, // WalletUnlocked ou Vault
  assets: [{ to, amount, assetId }],
});

// Opção 2: Builder pattern
const tx = await vault.transaction({ assets: [...] });
const sponsoredTx = await tx.withSponsor(sponsorWallet);
await vault.send(sponsoredTx);

// Opção 3: Utility function
import { createSponsoredTransaction } from 'bakosafe';

const tx = await createSponsoredTransaction({
  sender: vault,           // quem envia os fundos
  sponsor: sponsorWallet,  // quem paga o gas
  assets: [{ to, amount, assetId }],
});
```

### Tarefas

- [ ] Definir API final (qual opção acima)
- [ ] Implementar helper para Wallet como sponsor
- [ ] Implementar helper para Vault como sponsor
- [ ] Simplificar sintaxe dos testes existentes
- [ ] Adicionar testes para os novos helpers
- [ ] Documentar uso

### Arquivos a Modificar
- `packages/sdk/src/modules/vault/Vault.ts`
- `packages/sdk/src/index.ts` (exports)
- `packages/tests/src/sponsored.test.ts`

---

## Fase 3: Gasless API ⏳

### Objetivo
Criar serviço de relay para que usuários sem ETH possam enviar transações.

### Arquitetura

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Usuario   │────▶│ Gasless API │────▶│   Sponsor   │
│   (dApp)    │     │   (Relay)   │     │    Pool     │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    Fuel     │
                    │   Network   │
                    └─────────────┘
```

### Endpoints Planejados

```
POST /gasless/submit     - Submeter transação patrocinada
GET  /gasless/quota/:id  - Verificar quota disponível
GET  /gasless/status/:tx - Status da transação
```

### Tarefas

- [ ] Definir estrutura do serviço
- [ ] Implementar endpoint de submit
- [ ] Implementar gerenciamento de pool
- [ ] Rate limiting por vault
- [ ] Integrar com SDK (`vault.sendGasless()`)

---

## Fase 4: Sponsor Predicate ⏳

### Objetivo
Criar predicate Sway para validar gastos do sponsor pool.

### Funcionalidades

- Validar assinatura do paymaster
- Limitar gas máximo por transação
- Verificar vaults autorizados
- Anti-replay (nonce)

### Tarefas

- [ ] Definir estrutura do intent
- [ ] Implementar predicate em Sway
- [ ] Testes do predicate
- [ ] Integrar com Gasless API

---

## Fase 5: Owner Policy ⏳

### Objetivo
Usar Owner Policy quando disponível para definir quem é o "owner" da transação.

### Dependência
- fuel-core v0.47+ (merged, aguardando release)
- fuels-ts com suporte a `ownerInputIndex`

### Benefício
```typescript
tx.ownerInputIndex = 0; // Vault é o "dono" mesmo com sponsor pagando gas
// msg_sender() nos contratos retorna o vault, não o sponsor
```

### Tarefas

- [ ] Aguardar release do fuel-core v0.47
- [ ] Atualizar fuels-ts
- [ ] Implementar uso do ownerInputIndex
- [ ] Atualizar testes

---

## Changelog

### 2025-02-03
- ✅ Criado teste para Vault 2/2 como sponsor
- ✅ Descoberto que `maxFee` faz parte do hash (requer re-assinatura)
- ✅ Documentado comportamento do predicate BakoSafe com múltiplas witnesses
- ✅ Criado branch `test/sponsored-transactions-vault-sponsor`
- ✅ Atualizado contexto em `bakosafe-context` repo

---

## Referências

- [Gasless Planning Doc](https://github.com/infinitybase/bakosafe-context/blob/main/gasless-fuel-planning.md)
- [fuel-specs #618 - Owner Policy](https://github.com/FuelLabs/fuel-specs/pull/618)
- [fuels-ts #3950 - Owner Policy Support](https://github.com/FuelLabs/fuels-ts/pull/3950)
- [Fuel Station - Gas Paymaster](https://forum.fuel.network/t/fuel-station-gas-paymaster-on-fuel/7078)
