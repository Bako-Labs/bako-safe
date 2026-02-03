# Gasless/Sponsored Transactions - Feature Tracker

Acompanhamento do desenvolvimento de transações patrocinadas (gasless) no BakoSafe.

## Status Geral

| Fase | Status | Descrição |
|------|--------|-----------|
| 1. Proof of Concept | ✅ Concluído | Testes validando cenários de sponsored tx |
| 2. SDK Helpers (tests) | ✅ Concluído | Helpers em test utils |
| 3. Worker UTXO Control | ✅ Revisado | Gerenciamento de pool via MongoDB |
| 4. Gasless API/Worker | ✅ Revisado | Worker cuida de reserve/sign, API não muda |
| 5. SDK Integration | 📋 Documentado | Métodos públicos no SDK |
| 6. UI Identification | 📋 Documentado | Badge/tags para gasless na UI |
| 7. Storage | ✅ Revisado | MongoDB para UTXOs, JSONB para witnesses |
| 8. Rate Limiting | ⏳ Pós-MVP | Quotas por workspace (documentado) |
| 9. Sponsor Predicate | ⏳ Futuro | Predicate Sway customizado (opcional) |
| 10. Segurança Distribuída | ⏳ Pós-MVP | Signers separados, Worker orquestra |
| 11. Owner Policy | ⏳ Aguardando | Depende de fuel-core v0.47+ |

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

## Fase 2: Test Helpers ✅

### Objetivo
Helpers para simplificar testes de transações patrocinadas.

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

## Fase 3: Worker - Controle de UTXOs 🔄

### Objetivo
Gerenciar o pool de UTXOs do sponsor vault usando MongoDB + Bull queue.

### Arquitetura

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│     SDK      │────▶│   MongoDB    │◀────│    Worker    │
│  (via HTTP)  │     │  (Pool)      │     │   (Bull)     │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Sponsor    │
                     │    Vault     │
                     └──────────────┘
```

### Estrutura MongoDB

```typescript
// Collection: gasless_utxos
{
  utxoId: string,
  amount: string,
  assetId: string,
  status: 'available' | 'locked' | 'spent',
  lockedBy?: { vaultId, reservationId, expiresAt },
}

// Collection: gasless_reservations
{
  reservationId: string,
  vaultId: string,
  utxoId: string,
  status: 'active' | 'used' | 'expired',
  expiresAt: Date,  // TTL index
}
```

> **Nota:** Detalhes completos da estrutura MongoDB na Fase 7.

### Jobs do Worker

| Job | Frequência | Descrição |
|-----|------------|-----------|
| `sync-utxos` | 5 min | Sincroniza UTXOs on-chain → MongoDB |
| `cleanup-expired` | 10 min | Limpa reservas expiradas (backup do TTL) |
| `fund-pool` | 15 min* | Cria novos UTXOs se pool baixo |

*Só executa se `available < MIN_UTXOS_FUND`

### Estrutura de Arquivos

```
/packages/worker/src/queues/gaslessPool/
├── constants.ts      # Config e nomes dos jobs
├── types.ts          # Interfaces
├── queue.ts          # Processor dos jobs
├── scheduler.ts      # Cron jobs
└── utils/
    ├── fetchSponsorUtxos.ts  # Busca UTXOs na Fuel
    ├── syncPool.ts           # Sync MongoDB ↔ Chain
    ├── cleanupExpired.ts     # Limpa locks expirados
    └── fundPool.ts           # Split UTXOs grandes
```

### Decisão: UTXO com Valor Fixo ✅

Todos os UTXOs do pool terão o **mesmo valor fixo** (ex: 0.0002 ETH).

**Benefícios:**
- Qualquer UTXO serve para qualquer transação (fungibilidade)
- Reserve é instantâneo (não precisa calcular gas antes)
- Simplifica lógica do pool

**Trade-off:**
- Transações simples "sobram" gas (troco volta ao sponsor)
- Transações complexas podem exceder (raro para transfers)

**Mitigação:**
- O troco sempre retorna ao sponsor vault
- Se TX exceder, falha e UTXO é liberado (usuário tenta novamente)
- Monitorar e ajustar valor fixo conforme uso real

### Configuração

```typescript
export const GASLESS_CONFIG = {
  // MongoDB collections
  COLLECTION_UTXOS: 'gasless_utxos',
  COLLECTION_RESERVATIONS: 'gasless_reservations',

  // Timings
  LOCK_TTL_SECONDS: 60 * 60,    // 1 hora
  SYNC_CRON: '*/5 * * * *',     // A cada 5 min

  // Pool management
  MIN_UTXOS_ALERT: 5,           // Alerta se < 5
  MIN_UTXOS_FUND: 3,            // Auto-fund se < 3
  TARGET_UTXOS: 20,             // Target: 20 UTXOs

  // UTXO sizing (valor fixo para todos)
  UTXO_SPLIT_AMOUNT: '200000000000000',  // 0.0002 ETH
  GAS_UTXO_MIN: '1000000000000000',      // 0.001 ETH (para consolidar/splitar)
};
```

### Funções do Worker

```typescript
// Reservar UTXO (atômico via findOneAndUpdate)
const utxo = await reserveUtxo(vaultId);
// → findOneAndUpdate({ status: 'available' }, { $set: { status: 'locked', lockedBy: {...} }})

// Liberar UTXO
await releaseUtxo(utxoId);
// → updateOne({ utxoId }, { $set: { status: 'available' }, $unset: { lockedBy: 1 }})

// Status do pool
const status = await getPoolStatus();
// → { available: 10, locked: 3, total: 13 }
```

### Fluxo fund-pool (Consolidar + Splitar)

O job `fund-pool` executa duas operações em sequência:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FUND-POOL: CONSOLIDAR + SPLITAR                          │
└─────────────────────────────────────────────────────────────────────────────┘

ETAPA 1: CONSOLIDAR (juntar UTXOs disponíveis)
──────────────────────────────────────────────
Objetivo: Transformar vários UTXOs pequenos em 1 UTXO grande

┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ UTXO 1   │  │ UTXO 2   │  │ UTXO 3   │  │ GAS UTXO │ ← Paga a TX
│ 0.0002   │  │ 0.0002   │  │ 0.0001   │  │ 0.001    │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │             │
     └─────────────┴─────────────┴─────────────┘
                         │
                         ▼
                  ┌─────────────┐
                  │ UTXO GRANDE │
                  │   0.0013    │ (soma - gas fee)
                  └─────────────┘

ETAPA 2: SPLITAR (dividir em UTXOs padrão)
──────────────────────────────────────────
Objetivo: Criar N UTXOs de tamanho fixo para o pool

                  ┌─────────────┐
                  │ UTXO GRANDE │
                  │   0.0013    │
                  └──────┬──────┘
                         │
     ┌───────────────────┼───────────────────┐
     │         │         │         │         │
     ▼         ▼         ▼         ▼         ▼
┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐
│ 0.0002 ││ 0.0002 ││ 0.0002 ││ 0.0002 ││ 0.0002 │ → Pool
└────────┘└────────┘└────────┘└────────┘└────────┘
                         +
                  ┌────────────┐
                  │  0.0003    │ → GAS UTXO (próxima consolidação)
                  └────────────┘
```

**Regras:**

1. **GAS UTXO**: Sempre manter 1 UTXO reservado (~0.001 ETH) para pagar as TXs de consolidação/split
2. **Consolidação**: Só executa se há UTXOs disponíveis fora do pool (não reservados)
3. **Split**: Cria UTXOs de 0.0002 ETH + 1 novo GAS UTXO com o restante
4. **Trigger**: Executa quando `available < MIN_UTXOS_FUND`

**Fluxo detalhado:**

```
1. Verifica: available < MIN_UTXOS_FUND?
2. Busca: todos UTXOs do vault on-chain
3. Filtra: remove os que estão locked no MongoDB
4. Identifica: GAS_UTXO (maior UTXO disponível, >= 0.001 ETH)
5. Consolida: envia todos UTXOs → vault (1 output grande)
   - GAS_UTXO paga o fee
6. Aguarda: confirmação da TX
7. Splita: UTXO grande → N outputs de 0.0002 + 1 GAS_UTXO
8. Sync: próximo ciclo adiciona novos UTXOs ao MongoDB
```

> ⚠️ **CONSTRAINT: Dust Limit**
>
> **Valores abaixo de 0.0002 ETH não podem ser usados como UTXO na Fuel.**
>
> Isso significa:
> - UTXO_SPLIT_AMOUNT deve ser >= 0.0002 ETH
> - GAS_UTXO também deve ser >= 0.0002 ETH
> - Ao splitar, o "resto" deve ser >= 0.0002 ou incorporado em outro UTXO
>
> **Cálculo do split:**
> ```
> UTXO_GRANDE = 0.0013 ETH
> SPLIT_AMOUNT = 0.0002 ETH
>
> Quantidade de UTXOs = floor(0.0013 / 0.0002) = 6
> Resto = 0.0013 - (6 * 0.0002) = 0.0001 ETH
>
> ❌ Resto < 0.0002, não pode ser UTXO separado
> ✅ Solução: criar 5 UTXOs + 1 UTXO de 0.0003 (absorve o resto)
> ```

> ⚠️ **NOTA: Cálculos a Refinar**
>
> Os valores (0.0002 ETH por UTXO, 0.001 ETH para GAS_UTXO) são estimativas iniciais.
> Esta lógica de consolidar + splitar é o padrão correto, mas os valores precisam
> ser refinados com base em:
> - Gas price real da mainnet
> - Custo médio observado das transações gasless
> - Volume de uso da funcionalidade
>
> À medida que a funcionalidade ganha escala, devemos:
> - [ ] Monitorar custo real por TX gasless
> - [ ] Ajustar UTXO_SPLIT_AMOUNT dinamicamente
> - [ ] Otimizar frequência de consolidação (menos TXs = menos fees)
> - [ ] Considerar batch de splits em horários de gas baixo

### Ciclo de Vida do UTXO

```
Depósito no Vault
       │
       ▼
┌─────────────────┐
│  UTXO Grande    │
│    (ex: 1 ETH)  │
└────────┬────────┘
         │ fund-pool (split)
         ▼
┌─────────────────┐
│  Pool MongoDB   │
│  [utxo_1, ...]  │ ◄── sync-utxos mantém atualizado
└────────┬────────┘
         │ reserveUtxo()
         ▼
┌─────────────────┐
│  Locked (TTL)   │
│  { vaultId }    │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
 SUCCESS   TIMEOUT
    │         │
    ▼         ▼
 Consumido  Retorna
 (spent)    ao pool
```

### Variáveis de Ambiente

```bash
# Sponsor vault
GASLESS_SPONSOR_ADDRESS=0x...
GASLESS_SPONSOR_PK=0x...        # PK do signer automático

# MongoDB (já existe no worker)
WORKER_MONGO_URI=mongodb://...
```

### Custo por UTXO

> **TODO:** Calcular baseado no gas médio de transações gasless.
> Ver seção "Estimativa de Custo" abaixo.

---

## Estimativa de Custo por UTXO

### Fatores que influenciam o gas

| Componente | Gas Estimado |
|------------|--------------|
| Base transaction | ~10,000 |
| Script execution | ~5,000 |
| Predicate verification (BakoSafe) | ~50,000-60,000 |
| Inputs/Outputs | ~1,000 cada |
| **Total típico** | **~70,000-80,000 gas** |

### Cálculo

```
Gas médio por tx gasless: ~80,000
Gas price (Fuel mainnet): ~1 gwei (variável)

Custo por tx = 80,000 * 1 gwei = 0.00008 ETH

Com margem de segurança (2x): 0.00016 ETH
Arredondando: 0.0002 ETH por UTXO

Em wei: 200,000,000,000,000 (200_000_000_000_000)
```

### Configuração Recomendada

```typescript
// Testnet e Mainnet (dust limit obrigatório)
UTXO_SPLIT_AMOUNT: '200000000000000',  // 0.0002 ETH (mínimo permitido)
```

> **Nota:** O dust limit de 0.0002 ETH é o mesmo para testnet e mainnet.
> Não é possível criar UTXOs menores que esse valor.

### Estimativa de Custos Mensais

| UTXOs/dia | Custo/UTXO | Custo/dia | Custo/mês |
|-----------|------------|-----------|-----------|
| 100 | 0.0002 ETH | 0.02 ETH | 0.6 ETH |
| 500 | 0.0002 ETH | 0.1 ETH | 3 ETH |
| 1000 | 0.0002 ETH | 0.2 ETH | 6 ETH |

> **Nota:** Estes valores são estimativas. Monitorar uso real e ajustar.

---

## Fase 4: Gasless API 🔄

### Objetivo
Criar endpoints na **bsafe-api existente** para suportar transações patrocinadas (gasless).

### Arquitetura Atual (sem gasless)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUXO ATUAL DE TRANSAÇÃO                            │
└─────────────────────────────────────────────────────────────────────────────┘

    UI/dApp              SDK (bakosafe)           API (bsafe-api)         Fuel
       │                      │                        │                   │
       │  vault.transaction() │                        │                   │
       │─────────────────────▶│                        │                   │
       │                      │                        │                   │
       │                      │  POST /transaction     │                   │
       │                      │  { name, assets, ... } │                   │
       │                      │───────────────────────▶│                   │
       │                      │                        │── Monta TX        │
       │                      │                        │── Salva no DB     │
       │                      │  { transaction }       │                   │
       │                      │◀───────────────────────│                   │
       │                      │                        │                   │
       │  Usuário assina      │                        │                   │
       │◀─────────────────────│                        │                   │
       │─────────────────────▶│                        │                   │
       │                      │                        │                   │
       │                      │  POST /transaction/:id/sign                │
       │                      │───────────────────────▶│                   │
       │                      │                        │── Adiciona witness│
       │                      │                        │                   │
       │                      │                        │ (quando threshold)│
       │                      │                        │──────────────────▶│
       │                      │                        │      Envia TX     │
```

### Arquitetura Proposta (com gasless)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RESPONSABILIDADES                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│        API         │  │       Worker       │  │      MongoDB       │
│  (não muda)        │  │  (gasless logic)   │  │      (pool)        │
├────────────────────┤  ├────────────────────┤  ├────────────────────┤
│ • Salva TX no DB   │  │ • GASLESS_SPONSOR_PK│  │ • UTXOs available │
│ • Coleta witnesses │  │ • Usa SDK bakosafe │  │ • UTXOs locked     │
│ • Envia para Fuel  │  │ • Reserva UTXO     │  │ • Metadata         │
│                    │  │ • Assina TX        │  │                    │
│                    │  │ • Gerencia pool    │  │                    │
│                    │  │ • Valida quota*    │  │                    │
└────────────────────┘  └────────────────────┘  └────────────────────┘

* Quota é opcional e controlada pelo Worker se implementada
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FLUXO GASLESS (API + WORKER)                           │
└─────────────────────────────────────────────────────────────────────────────┘

    SDK (client)              API (bsafe-api)              Worker (bsafe-worker)
         │                          │                             │
         │  POST /worker/gasless/reserve                              │
         │  { vaultId }             │                             │
         │─────────────────────────▶│─────────────────────────────▶│
         │                          │                             │── Reserva UTXO
         │                          │                             │── MongoDB find
         │                          │                             │── Lock UTXO
         │                          │  { utxo, sponsorVault }     │
         │                          │◀────────────────────────────│
         │  { utxo, sponsorVault }  │                             │
         │◀─────────────────────────│                             │
         │                          │                             │
         │  SDK monta TX completa   │                             │
         │  (inclui sponsor input)  │                             │
         │                          │                             │
         │  POST /transaction       │                             │
         │  { tx, isGasless: true,  │                             │
         │    reservationId }       │                             │
         │─────────────────────────▶│                             │
         │                          │  Delega assinatura          │
         │                          │────────────────────────────▶│
         │                          │                             │── Usa SDK
         │                          │                             │── Assina com PK
         │                          │  { tx com sponsor sig }     │
         │                          │◀────────────────────────────│
         │                          │── Salva TX no DB            │
         │  { transaction }         │                             │
         │◀─────────────────────────│                             │
         │                          │                             │
         │  (coleta assinaturas do vault - fluxo normal)          │
         │                          │                             │
         │                          │  Quando threshold atingido  │
         │                          │────────────────────────────▶│
         │                          │                             │── Envia para Fuel
         │                          │                             │── Release UTXO
```

### Modificações na bsafe-api

| Componente | Modificação |
|------------|-------------|
| **Tabelas** | ❌ Nenhuma alteração necessária |
| **POST /transaction** | Detectar `isGasless` e delegar assinatura ao Worker |
| **Comunicação** | API → Worker via path `/worker/*` |

### Estrutura de Witnesses (Gasless)

As witnesses são armazenadas em `transaction.resume.witnesses` (JSONB). Para gasless, usamos a tag `isSponsor`:

```typescript
// transaction.resume.witnesses para transação gasless
[
  { account: "0xvault_signer1", signature: "...", status: "DONE", isSponsor: false },
  { account: "0xvault_signer2", signature: null,  status: "PENDING", isSponsor: false },
  { account: "0xsponsor_vault", signature: "...", status: "DONE", isSponsor: true },  // ← ÚLTIMO
]
```

**Regras:**
- ✅ Sponsor é **sempre o último** na lista de witnesses
- ✅ Sponsor tem tag `isSponsor: true`
- ✅ Não precisa alterar tabelas - usa estrutura JSONB existente
- ✅ Sponsor signature é adicionada pelo Worker antes de retornar ao usuário

### Modificações no bsafe-worker

| Componente | Modificação |
|------------|-------------|
| **Env vars** | `GASLESS_SPONSOR_PK`, `GASLESS_SPONSOR_ADDRESS` |
| **Nova queue** | `gaslessPool` (sync, cleanup, fund) |
| **Novo job** | `gasless:sign` - assina TX com sponsor PK usando SDK |
| **Novo job** | `gasless:reserve` - reserva UTXO do MongoDB |
| **SDK** | Usa bakosafe SDK para manipular TX e assinar |
| **HTTP endpoints** | Expor endpoints para SDK comunicar diretamente |

### Comunicação SDK → Worker

A SDK usa um provider que aponta para a API. O Worker será acessível pelo mesmo domínio com um path adicional (redirect na infra):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ROTEAMENTO POR PATH                                 │
└─────────────────────────────────────────────────────────────────────────────┘

                           api.bakosafe.com
                                  │
                 ┌────────────────┴────────────────┐
                 │                                 │
           /*  (default)                    /worker/*
                 │                                 │
                 ▼                                 ▼
          ┌────────────┐                   ┌────────────┐
          │    API     │                   │   Worker   │
          │  (bsafe)   │                   │  (bsafe)   │
          └────────────┘                   └────────────┘

Exemplos:
├── api.bakosafe.com/transaction     → API
├── api.bakosafe.com/vault           → API
├── api.bakosafe.com/worker/gasless/reserve  → Worker
└── api.bakosafe.com/worker/gasless/sign     → Worker
```

**SDK Provider:**

```typescript
// packages/sdk/src/api/provider.ts

class BakoProvider {
  private baseUrl: string;  // api.bakosafe.com

  // Métodos existentes (API)
  async createTransaction(...) {
    return this.post('/transaction', ...);
  }

  // Novos métodos (Worker via /worker/*)
  async gaslessReserve(vaultId: string) {
    return this.post('/worker/gasless/reserve', { vaultId });
  }

  async gaslessSign(tx: Transaction, reservationId: string) {
    return this.post('/worker/gasless/sign', { tx, reservationId });
  }
}
```

**Infraestrutura:**
- Mesmo domínio (`api.bakosafe.com`)
- Path `/worker/*` redireciona para o Worker
- SDK não precisa saber que são serviços diferentes
- Mantém compatibilidade com provider existente

### Arquitetura Detalhada

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FLUXO GASLESS                                   │
└─────────────────────────────────────────────────────────────────────────────┘

          SDK                                                  Worker
           │                                                       │
           │  POST /worker/gasless/reserve                         │
           │──────────────────────────────────────────────────────▶│
           │                                                       │── reserveUtxo(MongoDB)
           │    { utxo, sponsorId }  │                           │
           │◀────────────────────────│                           │
           │                         │                           │
           │  [Monta TX com sponsor] │                           │
           │                         │                           │
           │  POST /transaction      │                           │
           │  { tx, witnesses,       │                           │
           │    isGasless: true }    │                           │
           │────────────────────────▶│                           │
           │                         │                           │
           │                         │── assina com PK sponsor ──│
           │                         │                           │
           │  POST /worker/gasless/release (ou automático)          │
           │  { utxoId, status }     │                           │
           │──────────────────────────────────────────────────────▶│
           │                         │                           │── releaseUtxo(MongoDB)
           │                         │                           │
```

### Endpoints do Worker

> **NOTA:** Todos os endpoints gasless são servidos pelo Worker via path `/worker/*`
> O SDK usa o mesmo domínio (`api.bakosafe.com`) e a infra redireciona.

#### `POST /worker/gasless/reserve`

Reserva um UTXO do pool para uma transação gasless.

```typescript
// Request
{
  vaultId: string;      // Vault que receberá o patrocínio
  estimatedGas?: BN;    // Gas estimado (para escolher UTXO adequado)
}

// Response
{
  utxo: {
    id: string;
    txId: string;
    outputIndex: number;
    amount: string;
    assetId: string;
  };
  sponsorVault: {
    address: string;
    predicateData: string;    // Para SDK montar input
  };
  expiresAt: string;          // ISO timestamp
  reservationId: string;      // Para release posterior
}

// Errors
400: { error: "VAULT_NOT_ELIGIBLE" }     // Vault não tem quota
429: { error: "QUOTA_EXCEEDED" }         // Limite atingido
503: { error: "POOL_EXHAUSTED" }         // Sem UTXOs disponíveis
```

#### `POST /worker/gasless/release`

Libera um UTXO reservado (sucesso ou falha).

```typescript
// Request
{
  reservationId: string;
  status: "completed" | "cancelled" | "failed";
  txHash?: string;            // Se completed
  reason?: string;            // Se failed/cancelled
}

// Response
{
  success: true;
}
```

#### `GET /worker/gasless/quota/:vaultId`

Verifica quota disponível de um vault.

```typescript
// Response
{
  vaultId: string;
  workspace: {
    id: string;
    plan: "free" | "starter" | "pro" | "enterprise";
  };
  quota: {
    daily: { used: 5, limit: 10, remaining: 5 };
    monthly: { used: 45, limit: 100, remaining: 55 };
  };
  eligible: boolean;
}
```

#### `GET /worker/gasless/status`

Status do pool de sponsors (admin/debug).

```typescript
// Response
{
  pool: {
    available: 15;
    locked: 3;
    total: 18;
    minUtxoAmount: "200000000000000";
  };
  sponsor: {
    address: string;
    totalBalance: string;
  };
}
```

### Modificações em Endpoints Existentes

#### `POST /transaction` (existente)

Adicionar suporte para transações gasless:

```typescript
// Request (campos adicionais)
{
  // ... campos existentes ...
  isGasless?: boolean;
  gaslessReservationId?: string;    // Referência ao UTXO reservado
}

// Comportamento adicional
if (isGasless && gaslessReservationId) {
  1. Validar reservationId
  2. Obter PK do sponsor
  3. Assinar tx com sponsor
  4. Adicionar signature às witnesses
  5. Marcar UTXO como usado
}
```

### Tarefas

- [ ] Criar controller `GaslessController` no Worker
- [ ] Criar service `GaslessService` no Worker
- [ ] Implementar `POST /worker/gasless/reserve`
- [ ] Implementar `POST /worker/gasless/release`
- [ ] Implementar `POST /worker/gasless/sign`
- [ ] Implementar `GET /worker/gasless/quota/:vaultId`
- [ ] Implementar `GET /worker/gasless/status`
- [ ] Adicionar logs/métricas para gasless

---

## Fase 5: SDK Integration 🔄

### Objetivo
Expor métodos no SDK para que desenvolvedores possam facilmente criar transações gasless.

### Princípio Fundamental: Imutabilidade do Hash

> **REGRA:** A assinatura só acontece quando a montagem da TX está 100% concluída.
> Nenhuma alteração pode ocorrer após o hash ser calculado para assinatura.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    O QUE AFETA vs NÃO AFETA O HASH                          │
└─────────────────────────────────────────────────────────────────────────────┘

        FAZ PARTE DO HASH                    NÃO FAZ PARTE DO HASH
        (alterar = reassinar)                (pode alterar depois)
        ─────────────────────                ─────────────────────
        • inputs                             • witnesses
        • outputs                            • predicateGasUsed
        • maxFee
        • gasLimit
        • script/scriptData
```

**Implicação para Gasless:**

```
ANTES do hash (SDK monta):              DEPOIS do hash (Worker adiciona):
──────────────────────────              ─────────────────────────────────
✅ Adicionar sponsor input              ✅ Adicionar sponsor signature
✅ Adicionar sponsor change output         (vai no array witnesses)
✅ Estimar gas/fees
✅ Calcular hash final
                    │
                    ▼
            HASH CALCULADO
            (TX imutável)
                    │
                    ▼
            Usuário assina
            Worker assina (sponsor)
```

### API Pública

```typescript
// Uso simples para o desenvolvedor
const tx = await vault.transaction({
  name: 'My transfer',
  assets: [{ assetId, amount, to }],
  gasless: true,                        // ← Nova opção
});

// Retorno igual ao fluxo normal
// { tx, hashTxId, encodedTxId }
```

### Fluxo Interno do SDK

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              FLUXO vault.transaction({ gasless: true })                     │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────┐
                    │  FASE 1: MONTAGEM DA TX             │
                    │  (tudo que afeta o hash)            │
                    │  ─────────────────────              │
                    │  SDK é responsável                  │
                    └─────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    │                               │                               │
    ▼                               ▼                               ▼
┌────────────┐              ┌────────────────┐              ┌────────────────┐
│ 1. Reserve │              │ 2. Monta TX    │              │ 3. Estima gas  │
│    UTXO    │              │    completa    │              │    e fees      │
│            │              │                │              │                │
│ Worker     │              │ • vault inputs │              │ • maxFee       │
│ retorna    │─────────────▶│ • sponsor input│─────────────▶│ • gasLimit     │
│ sponsorIn- │              │ • outputs      │              │                │
│ put pronto │              │ • change outs  │              │ HASH FINAL     │
└────────────┘              └────────────────┘              └───────┬────────┘
                                                                    │
                    ┌───────────────────────────────────────────────┘
                    │
                    ▼
                    ┌─────────────────────────────────────┐
                    │  FASE 2: SPONSOR ASSINA PRIMEIRO    │
                    │  (antes do usuário ver a TX)        │
                    └─────────────────────────────────────┘
                                    │
                                    ▼
                    ┌────────────────────────────────────┐
                    │ 4. POST /transaction               │
                    │    { txData, isGasless,            │
                    │      reservationId }               │
                    │                                    │
                    │    API delega ao Worker            │
                    │    ↓                               │
                    │    Worker assina com sponsor PK    │
                    │    ↓                               │
                    │    Salva TX + sponsor witness      │
                    │    (isSponsor: true, último)       │
                    └────────────────────────────────────┘
                                    │
                                    ▼
                    ┌────────────────────────────────────┐
                    │ 5. Retorna TX para usuário         │
                    │    (JÁ COM sponsor signature)      │
                    │                                    │
                    │    witnesses: [                    │
                    │      { vault1, null, PENDING },    │
                    │      { vault2, null, PENDING },    │
                    │      { sponsor, "0x...", DONE,     │
                    │        isSponsor: true }           │
                    │    ]                               │
                    └────────────────────────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────────┐
                    │  FASE 3: USUÁRIO ASSINA            │
                    │  (quando threshold → envia TX)     │
                    └─────────────────────────────────────┘
                                    │
                                    ▼
                    ┌────────────────────────────────────┐
                    │ 6. Usuário assina                  │
                    │    POST /transaction/:id/sign      │
                    │                                    │
                    │ 7. Quando threshold atingido:      │
                    │    → TX já tem sponsor sig         │
                    │    → Envia para Fuel Network       │
                    └────────────────────────────────────┘
```

**Resumo do fluxo:**
1. SDK monta TX completa (com sponsor input)
2. SDK envia para API
3. **Worker assina ANTES de retornar** (sponsor signature já incluída)
4. Usuário recebe TX pronta para assinar
5. Quando threshold do vault é atingido → TX enviada (sponsor já assinou)

> **UX: Zero espera para o usuário**
>
> O sponsor assina durante a criação da TX (síncrono).
> Quando o usuário confirma sua assinatura e o threshold é atingido,
> a TX é enviada **imediatamente** - não há espera por assinatura do sponsor.

### Interface do Worker: Reserve

```typescript
// POST /worker/gasless/reserve

// Request
interface GaslessReserveRequest {
  vaultId: string;
  predicateAddress: string;
}

// Response - Worker retorna input PRONTO para adicionar
interface GaslessReserveResponse {
  reservationId: string;
  expiresAt: string;

  // Input completo do sponsor (SDK só adiciona na TX)
  sponsorInput: {
    type: 'coin';
    id: string;
    owner: string;
    amount: string;
    assetId: string;
    txPointer: { blockHeight: number; txIndex: number };
    predicate: string;      // bytecode do sponsor vault
    predicateData: string;  // configurable encoded
  };

  // Para change output
  sponsorAddress: string;
}
```

### Interface do Worker: Sign

```typescript
// POST /worker/gasless/sign

// Request
interface GaslessSignRequest {
  reservationId: string;
  txHash: string;
}

// Response
interface GaslessSignResponse {
  signature: string;  // BAKO encoded
}
```

### Modificações no SDK

**1. Tipo VaultTransaction (`types.ts`):**
```typescript
export type VaultTransaction = {
  name?: string;
  assets: ITransferAsset[];
  gasless?: boolean;  // NOVO
};
```

**2. Método transaction (`Vault.ts`):**
```typescript
async transaction(params: VaultTransaction) {
  const { assets, gasless } = params;

  // ═══════════════════════════════════════════════════════════════
  // FASE 1: MONTAGEM (afeta hash)
  // ═══════════════════════════════════════════════════════════════

  let gaslessReservation = null;

  // Se gasless, reservar UTXO ANTES de montar
  if (gasless && this.provider instanceof BakoProvider) {
    gaslessReservation = await this.provider.service.reserveGasless(
      this.id,
      this.address.toB256()
    );
  }

  // Monta TX normalmente
  const tx = new ScriptTransactionRequest();

  // ... código existente: adiciona vault inputs, outputs ...

  // Se gasless, adicionar sponsor (AINDA NA FASE DE MONTAGEM)
  if (gaslessReservation) {
    // Adiciona input do sponsor (já vem pronto do Worker)
    tx.inputs.push(gaslessReservation.sponsorInput);

    // Adiciona change output do sponsor
    const baseAssetId = await this.provider.getBaseAssetId();
    tx.addChangeOutput(
      Address.fromB256(gaslessReservation.sponsorAddress),
      baseAssetId
    );
  }

  // Popula predicate data
  this.populateTransactionPredicateData(tx);

  // ═══════════════════════════════════════════════════════════════
  // FASE 2: PREPARAÇÃO E ENVIO (hash calculado aqui)
  // ═══════════════════════════════════════════════════════════════

  return this.BakoTransfer(tx, {
    name: params.name,
    isGasless: gasless,
    reservationId: gaslessReservation?.reservationId,
  });
}
```

**3. Payload da API (`ICreateTransactionPayload`):**
```typescript
interface ICreateTransactionPayload {
  predicateAddress: string;
  name?: string;
  hash: string;
  txData: TransactionRequest;
  status: TransactionStatus;

  // NOVO - Gasless
  isGasless?: boolean;
  gaslessReservationId?: string;
}
```

### Tarefas

- [ ] Adicionar `gasless?: boolean` ao tipo `VaultTransaction`
- [ ] Adicionar métodos `reserveGasless()` e `signGasless()` no `Service.ts`
- [ ] Modificar `vault.transaction()` para suportar gasless
- [ ] Modificar `ICreateTransactionPayload` com campos gasless
- [ ] Testes de integração

---

## Fase 6: UI Identification ✅

### Objetivo
Sinalizar nos detalhes da transação que ela é patrocinada (gasless).

### Identificação

A UI identifica transações gasless através do `txData` retornado pela API:

```typescript
// Verificar se transação é gasless
const isGasless = transaction.resume.witnesses.some(w => w.isSponsor === true);

// Ou via campo dedicado (se adicionado)
const isGasless = transaction.isGasless;
```

### Exibição

Nos detalhes da transação, exibir indicação simples:
- "Gas sponsored by BakoSafe" ou similar
- Informação do sponsor address (opcional)

> **Nota:** Detalhes de implementação da UI ficam a cargo do time de frontend.
> Este documento foca na integração backend (Worker, SDK, API).

---

## Fase 7: Storage ✅

### Decisão: MongoDB (Worker)

Para o MVP, o gerenciamento de UTXOs e reservas será feito via **MongoDB**, que o Worker já utiliza.

### Por que MongoDB?

| Aspecto | MongoDB | Redis |
|---------|---------|-------|
| **Já em uso** | ✅ Worker já usa | Requer adicionar |
| **Persistência** | ✅ Dados seguros | Volátil (pode perder) |
| **Queries** | ✅ Flexíveis | Limitadas |
| **Velocidade** | ~10-50ms | ~1ms |
| **TTL** | ✅ Suporta índices TTL | Nativo |

**Para o MVP**, MongoDB é suficiente e evita adicionar infraestrutura.

> **Evolução futura:** Se o volume de requests crescer significativamente,
> Redis pode ser adicionado como cache na frente do MongoDB para reduzir latência.
> O job `sync-utxos` já reconcilia com o estado on-chain, então a arquitetura
> suporta essa evolução sem grandes mudanças.

### Estrutura MongoDB

```typescript
// Collection: gasless_utxos
{
  _id: ObjectId,
  utxoId: string,           // ID do UTXO on-chain
  amount: string,           // Valor em wei
  assetId: string,          // Base asset ID
  status: 'available' | 'locked' | 'spent',

  // Lock info (quando status = 'locked')
  lockedBy?: {
    vaultId: string,
    reservationId: string,
    expiresAt: Date,
  },

  // Metadata
  createdAt: Date,
  updatedAt: Date,
}

// Índices
{ status: 1 }                    // Buscar disponíveis
{ "lockedBy.expiresAt": 1 }      // TTL para cleanup
{ utxoId: 1 }                    // Unique
```

```typescript
// Collection: gasless_reservations
{
  _id: ObjectId,
  reservationId: string,    // UUID
  vaultId: string,
  utxoId: string,
  status: 'active' | 'used' | 'expired' | 'cancelled',

  expiresAt: Date,
  createdAt: Date,
  usedAt?: Date,
}

// Índice TTL para auto-expirar
{ expiresAt: 1 }, { expireAfterSeconds: 0 }
```

### Witnesses na API (Postgres)

As informações de assinatura do sponsor são armazenadas na estrutura JSONB existente:

```typescript
// transaction.resume.witnesses (JSONB existente na API)
[
  { account: "0xsigner1", signature: "...", status: "DONE", isSponsor: false },
  { account: "0xsponsor", signature: "...", status: "DONE", isSponsor: true },
]
```

**Não é necessário alterar tabelas na API** - apenas adicionar a tag `isSponsor: true` nas witnesses.

### Tarefas

- [x] Decidir storage: MongoDB ✅
- [ ] Criar collections no Worker
- [ ] Criar índices (status, TTL)
- [ ] Verificar tag `isSponsor` no JSONB de witnesses (API)

---

## Fase 8: Rate Limiting & Quotas ⏳ (Pós-MVP)

> **STATUS:** Deixar para depois do MVP. Documentado aqui para referência futura.
>
> **NOTA:** Se quotas forem implementadas, o controle deve ser feito pelo **Worker**,
> não pela API. O Worker já é responsável por toda a lógica gasless (reserve, sign, pool).
> A API mantém apenas seu papel atual de salvar e enviar transações.

### Objetivo
Controlar uso de gasless por workspace/vault para evitar abuso.

### Por que deixar para pós-MVP?

- MVP terá pool pequeno e uso controlado
- Monitoramento manual inicialmente
- Permite validar feature antes de adicionar complexidade
- Quotas podem ser ajustadas baseado em uso real

### Regras de Quota

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LIMITES POR PLANO                                   │
└─────────────────────────────────────────────────────────────────────────────┘

│ Plano      │ Diário  │ Mensal  │ Max por TX │ Notas                       │
├────────────┼─────────┼─────────┼────────────┼─────────────────────────────│
│ Free       │ 5       │ 50      │ 100k gas   │ Básico para testar          │
│ Starter    │ 10      │ 100     │ 200k gas   │ Pequenos projetos           │
│ Pro        │ 50      │ 500     │ 500k gas   │ Produção                    │
│ Enterprise │ Custom  │ Custom  │ Custom     │ Negociado                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Validação

```typescript
// Middleware de validação
async function validateGaslessQuota(
  vaultId: string,
  workspaceId: string
): Promise<boolean> {
  const workspace = await getWorkspace(workspaceId);
  const quota = await getQuotaForPlan(workspace.plan);
  const usage = await getUsageForToday(workspaceId);

  // Validações
  if (quota.daily_limit !== -1 && usage.daily_count >= quota.daily_limit) {
    throw new QuotaExceededException('DAILY_LIMIT_EXCEEDED');
  }

  const monthlyUsage = await getUsageForMonth(workspaceId);
  if (quota.monthly_limit !== -1 && monthlyUsage >= quota.monthly_limit) {
    throw new QuotaExceededException('MONTHLY_LIMIT_EXCEEDED');
  }

  return true;
}
```

### Incremento de Quota

```typescript
// Após transação gasless bem-sucedida
async function incrementGaslessUsage(workspaceId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  await db.query(`
    INSERT INTO gasless_usage (workspace_id, date, daily_count)
    VALUES ($1, $2, 1)
    ON CONFLICT (workspace_id, date)
    DO UPDATE SET daily_count = gasless_usage.daily_count + 1,
                  updated_at = NOW()
  `, [workspaceId, today]);
}
```

### Tarefas

- [ ] Criar `GaslessQuotaService`
- [ ] Implementar middleware de validação
- [ ] Criar endpoints de consulta de quota
- [ ] Adicionar tracking de uso
- [ ] Logs/alertas para quotas próximas do limite

---

## Fase 9: Sponsor Predicate ⏳ (Futuro)

### Objetivo
Criar predicate Sway customizado para o sponsor pool (opcional, melhoria futura).

### Funcionalidades Propostas

- Validar assinatura do paymaster
- Limitar gas máximo por transação
- Verificar vaults autorizados (whitelist)
- Anti-replay (nonce)

### Nota

> Para o MVP, usamos um Vault BakoSafe 1/5 como sponsor.
> Um predicate customizado só será necessário se quisermos regras mais complexas
> como limites de gas ou whitelist de vaults autorizados.

### Tarefas

- [ ] Avaliar necessidade após validação do MVP
- [ ] Definir estrutura do intent
- [ ] Implementar predicate em Sway
- [ ] Testes do predicate
- [ ] Integrar com Gasless API

---

## Fase 10: Owner Policy ⏳

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

## Sponsor Vault - Arquitetura

### MVP: Vault 1/5 Simplificado

Para validação inicial, o sponsor será um **Vault BakoSafe 1/5**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SPONSOR VAULT (MVP)                          │
│                         1/5                                     │
└─────────────────────────────────────────────────────────────────┘

Signers:
├── [1] Worker Signer (private key no Worker) ─── Assinatura automática
├── [2] Passkey Admin 1 ───────────────────────── Visualização/Backup
├── [3] Passkey Admin 2 ───────────────────────── Visualização/Backup
├── [4] Passkey Admin 3 ───────────────────────── Visualização/Backup
└── [5] Passkey Admin 4 ───────────────────────── Visualização/Backup

Threshold: 1 de 5
└── Worker assina sozinho, instantâneo
```

**Benefícios do MVP:**
- Uma assinatura = zero latência
- Passkeys permitem admins visualizarem todas as txs
- Backup manual disponível se API falhar
- Zero infraestrutura adicional

**Identificação do Sponsor:**
- Tag no vault: `BAKO_GASLESS_SPONSOR_V1`
- UI pode exibir: "Gas sponsored by BakoSafe"

### ⚠️ Considerações de Segurança (Pós-MVP)

> **ALERTA:** A arquitetura MVP mantém a private key do sponsor no Worker.
> Isso é aceitável para validação, mas deve ser melhorado antes de produção em larga escala.

**Riscos do MVP:**
- Comprometimento do Worker expõe a chave do sponsor
- Todos os fundos do pool podem ser drenados
- Sem segregação de responsabilidades

**Arquitetura Recomendada para Produção:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ARQUITETURA SEGURA (PÓS-MVP)                             │
│                    Sponsor Vault 2/3 Distribuído                            │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │    Worker    │
                              │ (orquestrador│
                              │  sem keys)   │
                              └──────┬───────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
             ┌────────────┐   ┌────────────┐   ┌────────────┐
             │  Signer A  │   │  Signer B  │   │  Signer C  │
             │ (Server 1) │   │ (Server 2) │   │ (Server 3) │
             │  us-east   │   │  eu-west   │   │  HSM/KMS   │
             │            │   │            │   │            │
             │  PK_A      │   │  PK_B      │   │  PK_C      │
             └─────┬──────┘   └─────┬──────┘   └─────┬──────┘
                   │                │                │
                   └────────────────┼────────────────┘
                                    │
                             ┌──────▼──────┐
                             │   Sponsor   │
                             │   Vault     │
                             │    2/3      │
                             └─────────────┘
```

**Fluxo de Assinatura Distribuída:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUXO: WORKER ORQUESTRA SIGNERS                          │
└─────────────────────────────────────────────────────────────────────────────┘

Worker                    Signer A              Signer B              Signer C
   │                         │                     │                     │
   │  POST /sign             │                     │                     │
   │  { txHash, vaultId }    │                     │                     │
   │────────────────────────▶│                     │                     │
   │                         │── Valida request    │                     │
   │                         │── Rate limit check  │                     │
   │                         │── Assina com PK_A   │                     │
   │  { signature_A }        │                     │                     │
   │◀────────────────────────│                     │                     │
   │                         │                     │                     │
   │  POST /sign             │                     │                     │
   │  { txHash, vaultId }    │                     │                     │
   │─────────────────────────────────────────────▶│                     │
   │                         │                     │── Valida request    │
   │                         │                     │── Rate limit check  │
   │                         │                     │── Assina com PK_B   │
   │  { signature_B }        │                     │                     │
   │◀─────────────────────────────────────────────│                     │
   │                         │                     │                     │
   │  Threshold atingido (2/3)                     │                     │
   │  Monta witnesses com signature_A + signature_B                      │
   │                         │                     │                     │
```

**Componentes da Arquitetura Segura:**

| Componente | Responsabilidade | Localização |
|------------|------------------|-------------|
| **Worker** | Orquestra requisições, NÃO tem keys | Servidor principal |
| **Signer A** | Guarda PK_A, valida e assina | us-east (AWS/GCP) |
| **Signer B** | Guarda PK_B, valida e assina | eu-west (AWS/GCP) |
| **Signer C** | Guarda PK_C em HSM/KMS | HSM dedicado |
| **Sponsor Vault** | Vault 2/3 on-chain | Fuel Network |

**Cada Signer Service deve:**

```typescript
// signer-service/src/sign.ts

async function handleSignRequest(req: SignRequest): Promise<SignResponse> {
  // 1. Validar origem (mTLS ou API key)
  validateOrigin(req.headers);

  // 2. Rate limiting independente
  await rateLimiter.check(req.vaultId);

  // 3. Validar que txHash é para vault autorizado
  await validateVaultAuthorization(req.vaultId);

  // 4. Log para auditoria
  await auditLog.record({
    action: 'SIGN_REQUEST',
    txHash: req.txHash,
    vaultId: req.vaultId,
    timestamp: Date.now(),
  });

  // 5. Assinar
  const signature = await signWithPK(req.txHash);

  // 6. Retornar assinatura encodeada
  return {
    signature: encodeBAKOSignature(SIGNER_ADDRESS, signature),
  };
}
```

**Melhorias de Segurança:**

| Melhoria | Descrição | Benefício |
|----------|-----------|-----------|
| **Isolamento geográfico** | Cada signer em região diferente | Compromisso de 1 não afeta outros |
| **HSM/KMS** | Pelo menos 1 signer usa hardware | Key nunca exposta em memória |
| **mTLS** | Comunicação Worker ↔ Signers | Autenticação mútua |
| **Rate limit por signer** | Cada signer valida independente | Defesa em profundidade |
| **Audit logs** | Logs independentes por signer | Rastreabilidade completa |
| **Vault 2/3** | Requer 2 de 3 assinaturas | Tolerância a falha de 1 signer |

**Quando migrar para esta arquitetura:**
- [ ] Após validar o MVP com usuários reais
- [ ] Antes de aumentar significativamente o pool de fundos
- [ ] Quando volume de transações justificar o custo
- [ ] Se houver requisitos de compliance (SOC2, etc.)

---

## Contexto Técnico: witness_index nos Predicates

### Como funciona o witness_index

Os predicates precisam saber onde buscar a assinatura no array de witnesses da transação. Existem duas abordagens diferentes no BakoSafe:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TIPOS DE PREDICATES E WITNESS_INDEX                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐     ┌─────────────────────────────┐
│   CONNECTOR PREDICATES      │     │     BAKO PREDICATES         │
│   (EVM, SVM, WebAuthn)      │     │     (Fuel origin)           │
├─────────────────────────────┤     ├─────────────────────────────┤
│                             │     │                             │
│  main(witness_index: u64)   │     │  main() // sem parâmetro    │
│         ↓                   │     │         ↓                   │
│  tx_witness_data(0)         │     │  itera TODAS witnesses      │
│         ↓                   │     │  procurando prefixo BAKO    │
│  Busca em witnesses[0]      │     │         ↓                   │
│                             │     │  Encontra por prefixo       │
└─────────────────────────────┘     └─────────────────────────────┘
```

### Connector Predicates: witness_index fixo

Predicates de origem Fuel (EVM, SVM, WebAuthn) recebem `witness_index` como parâmetro:

```sway
// Predicate Sway (Connector)
fn main(witness_index: u64) -> bool {
    let signature = tx_witness_data(witness_index);
    // Valida assinatura...
}
```

No SDK, esse valor é passado via `data` na instanciação:

```typescript
// VaultConfigurationFactory.ts - linha 64
static createConnectorConfiguration(...) {
  return {
    config: { SIGNER: ... },
    data: [0],  // ← witness_index = 0 (HARDCODED)
  };
}
```

**Fluxo:**
```
SDK                          Predicate
 │                              │
 │  data: [0]                   │
 │  ──────────────────────────▶ │
 │                              │  Encoded como predicateData
 │                              │  no input da TX
 │                              │
 │                              │  main(witness_index = 0)
 │                              │  tx_witness_data(0)
 │                              │  ↓
 │                              │  Busca witnesses[0]
```

### Bako Predicates: itera todas witnesses

Predicates BakoSafe (multisig) NÃO usam witness_index como parâmetro. Eles iteram TODAS as witnesses procurando o prefixo BAKO (`0x42414b4f`):

```typescript
// VaultConfigurationFactory.ts - linha 37
static createBakoConfiguration(...) {
  return {
    config: { SIGNERS, SIGNATURES_COUNT, HASH_PREDICATE },
    // SEM data - não usa witness_index
  };
}
```

**Por isso o predicate BakoSafe encontra sua assinatura independente da posição no array.**

### Implicações para Gasless

| Cenário | Vault | Sponsor | Funciona? |
|---------|-------|---------|-----------|
| MVP | Bako (multisig) | Bako 1/5 | ✅ Ambos iteram todas witnesses |
| Futuro | Connector | Bako | ✅ Connector em [0], Bako encontra em qualquer posição |
| Futuro | Bako | Connector | ⚠️ Problema se sponsor não estiver em [0] |
| Futuro | Connector | Connector | ⚠️ Ambos buscam em [0] - conflito! |

### Estrutura de Witnesses para Gasless

**Cenário MVP (Bako + Bako):**
```
witnesses:
├── [0] Vault signatures (BAKO encoded) ← Vault encontra pelo prefixo
├── [1] ... mais assinaturas vault
└── [N] Sponsor signature (BAKO encoded) ← Sponsor encontra pelo prefixo

✅ Ordem não importa - ambos usam prefixo BAKO
```

**Cenário Futuro (Connector vault + Bako sponsor):**
```
witnesses:
├── [0] Vault signature ← Connector busca aqui (hardcoded)
└── [1] Sponsor signature (BAKO encoded) ← Bako encontra pelo prefixo

✅ Funciona - cada um encontra sua assinatura
```

**Cenário Problemático (Bako vault + Connector sponsor):**
```
witnesses:
├── [0] Vault signatures (BAKO encoded)
└── [1] Sponsor signature ← Connector busca em [0], não encontra! ❌

❌ Sponsor Connector não encontra sua assinatura
```

### Solução Futura (se necessário)

Para suportar Connector como sponsor, seria necessário:

1. **Tornar witness_index configurável** no SDK (não hardcoded)
2. **Ou reorganizar witnesses** para sponsor Connector ficar em [0]
3. **Ou modificar o predicate** Connector para aceitar index dinâmico

> **Para o MVP:** Usando Bako 1/5 como sponsor, não há problema.
> Esta limitação só afeta cenários futuros com Connector como sponsor.

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
1. SDK solicita UTXO do sponsor ao Worker
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
   a. SDK/Worker adiciona sponsor input
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

## Ordem de Implementação (MVP)

Prioridade para viabilizar o MVP:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ORDEM DE IMPLEMENTAÇÃO                               │
└─────────────────────────────────────────────────────────────────────────────┘

1. WORKER - Pool MongoDB (Fase 3 + 7)
   └── Criar collections gasless_utxos, gasless_reservations
   └── Criar índices (status, TTL)
   └── Criar queue gaslessPool (Bull)
   └── Jobs: sync-utxos, cleanup-expired
   └── (fund-pool pode ser manual no início)

2. WORKER - Endpoints HTTP (Fase 4)
   └── POST /worker/gasless/reserve
   └── POST /worker/gasless/release
   └── POST /worker/gasless/sign
   └── GET /worker/gasless/status

3. SDK (Fase 5)
   └── Adicionar métodos no BakoProvider
   └── Modificar vault.transaction({ gasless: true })

4. UI (Fase 6)
   └── Badge "Gasless" nos detalhes da TX
   └── Identificar via tag isSponsor no witnesses

5. RATE LIMITING (Fase 8) - Pós-MVP
   └── Validação de quota no Worker
   └── Contadores em MongoDB (ou Redis para alta escala)
```

### Checklist MVP

- [ ] **MongoDB**: Collections e índices criados
- [ ] **Worker**: gaslessPool queue rodando
- [ ] **Worker**: Endpoints HTTP funcionando
- [ ] **SDK**: Método gasless disponível
- [ ] **E2E**: Teste completo vault → gasless → receiver
- [ ] **Deploy**: Variáveis de ambiente configuradas
- [ ] **Funding**: Sponsor vault com fundos suficientes

---

## Changelog

### 2026-02-03 (cont. 2)
- ✅ Documentada Fase 4: Gasless API (endpoints detalhados)
- ✅ Documentada Fase 5: SDK Integration (API pública)
- ✅ Documentada Fase 6: UI Identification
- ✅ Documentada Fase 7: Database Schema
- ✅ Documentada Fase 8: Rate Limiting & Quotas
- ✅ Reorganizadas fases (9 = Sponsor Predicate, 10 = Owner Policy)
- ✅ Adicionada seção "Ordem de Implementação"

### 2026-02-03 (cont.)
- ✅ Documentada arquitetura do Sponsor Vault (MVP 1/5)
- ✅ Documentados alertas de segurança e arquitetura pós-MVP
- ✅ Analisado fluxo atual da API e SDK para integração

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
