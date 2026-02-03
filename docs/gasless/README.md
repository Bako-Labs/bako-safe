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

### API Implementada (Test Utils)

```typescript
// Para Wallet sender (Tests 1 e 3)
import { sendSponsored } from './utils';

const result = await sendSponsored({
  sender: { account: wallet },
  sponsor: { account: sponsorVault, signers: [signer1, signer2] },
  transfers: [{ to, amount, assetId }],
  provider,
});

// Para Vault sender (Test 2)
import { sendSponsoredFromVault } from './utils';

const result = await sendSponsoredFromVault({
  vault,
  signers: [signer1, signer2],
  sponsor: walletSponsor,
  transfers: [{ to, amount, assetId }],
  provider,
});
```

### Tarefas

- [x] Implementar helper para Wallet sender + Wallet sponsor
- [x] Implementar helper para Wallet sender + Vault sponsor
- [x] Implementar helper para Vault sender + Wallet sponsor
- [x] Simplificar sintaxe de TODOS os testes
- [ ] Mover helpers para SDK
- [ ] Definir API pública final
- [ ] Documentar uso

### Helpers Disponíveis

| Helper | Sender | Sponsor | Test |
|--------|--------|---------|------|
| `sendSponsored()` | Wallet | Wallet | 1 |
| `sendSponsored()` | Wallet | Vault | 3 |
| `sendSponsoredFromVault()` | Vault | Wallet | 2 |

### Arquivos Relevantes
- Helper: `packages/tests/src/utils/sponsored.ts`
- Testes: `packages/tests/src/sponsored.test.ts`

### Próximos Passos
1. Mover helpers para `packages/sdk/src/`
2. Exportar em `packages/sdk/src/index.ts`
3. Decidir se integra ao `Vault` class ou mantém como utility functions

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

---

## Desafios Técnicos

### 1. UTXO do Sponsor deve estar na TX antes de assinar

**Problema:** O hash da transação inclui os `inputs`. Se adicionarmos o sponsor UTXO depois que o usuário assinou, o hash muda e a assinatura fica inválida.

**O que FAZ parte do hash:**
- `inputs` (incluindo UTXOs)
- `outputs`
- `maxFee`
- `gasLimit`

**O que NÃO faz parte do hash:**
- `predicateGasUsed`
- `witnesses`

**Fluxo obrigatório:**
```
1. SDK solicita UTXO do sponsor à API
2. SDK monta tx COM sponsor input incluído
3. Usuário assina (hash já inclui sponsor)
4. Coleta demais assinaturas (se multisig)
5. estimatePredicates com witnesses reais
6. Envia
```

### 2. UTXO do Sponsor fica travado durante coleta de assinaturas

**Problema:** Transações multisig (2/2, 3/5, etc.) podem demorar horas ou dias para coletar todas as assinaturas. Durante esse tempo, o UTXO do sponsor fica "reservado" e não pode ser usado em outras transações.

**Cenário problemático:**
```
T+0:   Tx criada, UTXO sponsor reservado
T+1h:  Signer 1 assina
T+24h: Signer 2 ainda não assinou
       → UTXO travado por 24h+
       → Pool de sponsors pode esgotar
```

**Possíveis soluções:**

| Solução | Prós | Contras |
|---------|------|---------|
| **Pool grande de UTXOs** | Simples | Custo de capital parado |
| **Timeout + liberação** | Libera recursos | Tx pode falhar se expirar |
| **Sponsor só no final** | UTXO travado por pouco tempo | Todos precisam re-assinar após adicionar sponsor |
| **Dois fluxos** | Otimizado por caso | Complexidade |

**Fluxo com re-assinatura (sponsor no final):**
```
1. SDK monta tx SEM sponsor
2. Signers assinam (hash A)
3. Quando todas assinaturas coletadas:
   a. API adiciona sponsor input
   b. Hash muda para B
   c. Todos signers re-assinam (hash B)
   d. Envia
```

**Fluxo com timeout:**
```
1. SDK solicita UTXO com TTL (ex: 1h)
2. Monta tx COM sponsor
3. Se não completar em 1h:
   a. UTXO liberado
   b. Tx precisa ser recriada com novo UTXO
```

### 3. Decisão Arquitetural Pendente

**Pergunta:** Qual fluxo adotar para multisig gasless?

- [ ] Pool grande + timeout
- [ ] Re-assinatura no final
- [ ] Híbrido (timeout curto + opção de re-assinar)
- [ ] Outro

---

## Changelog

### 2026-02-03
- ✅ Criado `sendSponsored()` helper para Wallet sender
- ✅ Criado `sendSponsoredFromVault()` helper para Vault sender
- ✅ Simplificado TODOS os 3 testes usando os helpers
- ✅ Arquivo de testes reduzido de ~270 para ~183 linhas (32% menor)
- ✅ Todos os 3 testes passando

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
