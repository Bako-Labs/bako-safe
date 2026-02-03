# Gasless/Sponsored Transactions - Feature Tracker

Development tracking for sponsored (gasless) transactions in BakoSafe.

## Overall Status

| Phase | Status | Description |
|-------|--------|-------------|
| 1. Proof of Concept | ✅ Completed | Tests validating sponsored tx scenarios |
| 2. SDK Helpers (tests) | ✅ Completed | Helpers in test utils |
| 3. Worker UTXO Control | ✅ Reviewed | Pool management via MongoDB |
| 4. Gasless API/Worker | ✅ Reviewed | Worker handles reserve/sign, API unchanged |
| 5. SDK Integration | 📋 Documented | Public SDK methods |
| 6. UI Identification | 📋 Documented | Badge/tags for gasless in UI |
| 7. Storage | ✅ Reviewed | MongoDB for UTXOs, JSONB for witnesses |
| 8. Rate Limiting | ⏳ Post-MVP | Quotas per workspace (documented) |
| 9. Sponsor Predicate | ⏳ Future | Custom Sway predicate (optional) |
| 10. Distributed Security | ⏳ Post-MVP | Separate signers, Worker orchestrates |
| 11. Owner Policy | ⏳ Waiting | Depends on fuel-core v0.47+ |

---

## Phase 1: Proof of Concept ✅

### Validated Scenarios

| # | Scenario | File | Status |
|---|----------|------|--------|
| 1 | Wallet sends, Wallet sponsors | `sponsored.test.ts` | ✅ |
| 2 | Vault 2/2 sends, Wallet sponsors | `sponsored.test.ts` | ✅ |
| 3 | Wallet sends, Vault 2/2 sponsors | `sponsored.test.ts` | ✅ |

### Technical Discoveries

#### What IS part of the transaction hash:
- `maxFee` ← **If changed after signing, must re-sign!**
- `gasLimit`
- `inputs` (including witnessIndex)
- `outputs`
- `script/scriptData`

#### What is NOT part of the hash:
- `predicateGasUsed` ← Can estimate after signing
- `witnesses`

#### BakoSafe Predicate Behavior:
- Ignores `witnessIndex` from input
- Iterates through ALL witnesses looking for BAKO prefix
- Allows multiple signatures for same input (Vault 2/2 as sponsor)

### Relevant Files
- Tests: `packages/tests/src/sponsored.test.ts`
- Context: `context/gasless-fuel-planning.md` (bakosafe-context repo)

---

## Phase 2: Test Helpers ✅

### Objective
Helpers to simplify sponsored transaction tests.

### Implemented API (Test Utils)

```typescript
// For Wallet sender (Tests 1 and 3)
import { sendSponsored } from './utils';

const result = await sendSponsored({
  sender: { account: wallet },
  sponsor: { account: sponsorVault, signers: [signer1, signer2] },
  transfers: [{ to, amount, assetId }],
  provider,
});

// For Vault sender (Test 2)
import { sendSponsoredFromVault } from './utils';

const result = await sendSponsoredFromVault({
  vault,
  signers: [signer1, signer2],
  sponsor: walletSponsor,
  transfers: [{ to, amount, assetId }],
  provider,
});
```

### Tasks

- [x] Implement helper for Wallet sender + Wallet sponsor
- [x] Implement helper for Wallet sender + Vault sponsor
- [x] Implement helper for Vault sender + Wallet sponsor
- [x] Simplify syntax of ALL tests
- [ ] Move helpers to SDK
- [ ] Define final public API
- [ ] Document usage

### Available Helpers

| Helper | Sender | Sponsor | Test |
|--------|--------|---------|------|
| `sendSponsored()` | Wallet | Wallet | 1 |
| `sendSponsored()` | Wallet | Vault | 3 |
| `sendSponsoredFromVault()` | Vault | Wallet | 2 |

### Relevant Files
- Helper: `packages/tests/src/utils/sponsored.ts`
- Tests: `packages/tests/src/sponsored.test.ts`

### Next Steps
1. Move helpers to `packages/sdk/src/`
2. Export in `packages/sdk/src/index.ts`
3. Decide whether to integrate into `Vault` class or keep as utility functions

---

## Phase 3: Worker - UTXO Control 🔄

### Objective
Manage the sponsor vault's UTXO pool using MongoDB + Bull queue.

### Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│     SDK      │────▶│   MongoDB    │◀────│    Worker    │
│  (via HTTP)  │     │   (Pool)     │     │   (Bull)     │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Sponsor    │
                     │    Vault     │
                     └──────────────┘
```

### MongoDB Structure

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

> **Note:** Complete MongoDB structure details in Phase 7.

### Worker Jobs

| Job | Frequency | Description |
|-----|-----------|-------------|
| `sync-utxos` | 5 min | Syncs UTXOs on-chain → MongoDB |
| `cleanup-expired` | 10 min | Cleans expired reservations (TTL backup) |
| `fund-pool` | 15 min* | Creates new UTXOs if pool is low |

*Only runs if `available < MIN_UTXOS_FUND`

### File Structure

```
/packages/worker/src/queues/gaslessPool/
├── constants.ts      # Config and job names
├── types.ts          # Interfaces
├── queue.ts          # Job processor
├── scheduler.ts      # Cron jobs
└── utils/
    ├── fetchSponsorUtxos.ts  # Fetch UTXOs from Fuel
    ├── syncPool.ts           # Sync MongoDB ↔ Chain
    ├── cleanupExpired.ts     # Clean expired locks
    └── fundPool.ts           # Split large UTXOs
```

### Decision: Fixed Value UTXO ✅

All pool UTXOs will have the **same fixed value** (e.g., 0.0002 ETH).

**Benefits:**
- Any UTXO works for any transaction (fungibility)
- Reserve is instant (no need to calculate gas beforehand)
- Simplifies pool logic

**Trade-off:**
- Simple transactions have "leftover" gas (change returns to sponsor)
- Complex transactions may exceed (rare for transfers)

**Mitigation:**
- Change always returns to sponsor vault
- If TX exceeds, it fails and UTXO is released (user tries again)
- Monitor and adjust fixed value based on real usage

### Configuration

```typescript
export const GASLESS_CONFIG = {
  // MongoDB collections
  COLLECTION_UTXOS: 'gasless_utxos',
  COLLECTION_RESERVATIONS: 'gasless_reservations',

  // Timings
  LOCK_TTL_SECONDS: 60 * 60,    // 1 hour
  SYNC_CRON: '*/5 * * * *',     // Every 5 min

  // Pool management
  MIN_UTXOS_ALERT: 5,           // Alert if < 5
  MIN_UTXOS_FUND: 3,            // Auto-fund if < 3
  TARGET_UTXOS: 20,             // Target: 20 UTXOs

  // UTXO sizing (fixed value for all)
  UTXO_SPLIT_AMOUNT: '200000000000000',  // 0.0002 ETH
  GAS_UTXO_MIN: '1000000000000000',      // 0.001 ETH (for consolidate/split)
};
```

### Worker Functions

```typescript
// Reserve UTXO (atomic via findOneAndUpdate)
const utxo = await reserveUtxo(vaultId);
// → findOneAndUpdate({ status: 'available' }, { $set: { status: 'locked', lockedBy: {...} }})

// Release UTXO
await releaseUtxo(utxoId);
// → updateOne({ utxoId }, { $set: { status: 'available' }, $unset: { lockedBy: 1 }})

// Pool status
const status = await getPoolStatus();
// → { available: 10, locked: 3, total: 13 }
```

### Fund-pool Flow (Consolidate + Split)

The `fund-pool` job executes two operations in sequence:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FUND-POOL: CONSOLIDATE + SPLIT                           │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 1: CONSOLIDATE (merge available UTXOs)
─────────────────────────────────────────────
Objective: Transform multiple small UTXOs into 1 large UTXO

┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ UTXO 1   │  │ UTXO 2   │  │ UTXO 3   │  │ GAS UTXO │ ← Pays the TX
│ 0.0002   │  │ 0.0002   │  │ 0.0001   │  │ 0.001    │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │             │
     └─────────────┴─────────────┴─────────────┘
                         │
                         ▼
                  ┌─────────────┐
                  │ LARGE UTXO  │
                  │   0.0013    │ (sum - gas fee)
                  └─────────────┘

STEP 2: SPLIT (divide into standard UTXOs)
─────────────────────────────────────────────
Objective: Create N fixed-size UTXOs for the pool

                  ┌─────────────┐
                  │ LARGE UTXO  │
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
                  │  0.0003    │ → GAS UTXO (next consolidation)
                  └────────────┘
```

**Rules:**

1. **GAS UTXO**: Always keep 1 reserved UTXO (~0.001 ETH) to pay consolidation/split TXs
2. **Consolidation**: Only runs if there are available UTXOs outside the pool (not reserved)
3. **Split**: Creates 0.0002 ETH UTXOs + 1 new GAS UTXO with the remainder
4. **Trigger**: Runs when `available < MIN_UTXOS_FUND`

**Detailed flow:**

```
1. Check: available < MIN_UTXOS_FUND?
2. Fetch: all vault UTXOs on-chain
3. Filter: remove those locked in MongoDB
4. Identify: GAS_UTXO (largest available UTXO, >= 0.001 ETH)
5. Consolidate: send all UTXOs → vault (1 large output)
   - GAS_UTXO pays the fee
6. Wait: TX confirmation
7. Split: large UTXO → N outputs of 0.0002 + 1 GAS_UTXO
8. Sync: next cycle adds new UTXOs to MongoDB
```

> ⚠️ **CONSTRAINT: Dust Limit**
>
> **Values below 0.0002 ETH cannot be used as UTXO on Fuel.**
>
> This means:
> - UTXO_SPLIT_AMOUNT must be >= 0.0002 ETH
> - GAS_UTXO must also be >= 0.0002 ETH
> - When splitting, the "remainder" must be >= 0.0002 or incorporated into another UTXO
>
> **Split calculation:**
> ```
> LARGE_UTXO = 0.0013 ETH
> SPLIT_AMOUNT = 0.0002 ETH
>
> Number of UTXOs = floor(0.0013 / 0.0002) = 6
> Remainder = 0.0013 - (6 * 0.0002) = 0.0001 ETH
>
> ❌ Remainder < 0.0002, cannot be separate UTXO
> ✅ Solution: create 5 UTXOs + 1 UTXO of 0.0003 (absorbs remainder)
> ```

> ⚠️ **NOTE: Values to Refine**
>
> The values (0.0002 ETH per UTXO, 0.001 ETH for GAS_UTXO) are initial estimates.
> This consolidate + split logic is the correct pattern, but values need
> to be refined based on:
> - Real mainnet gas price
> - Average observed cost of gasless transactions
> - Feature usage volume
>
> As the feature scales, we should:
> - [ ] Monitor real cost per gasless TX
> - [ ] Dynamically adjust UTXO_SPLIT_AMOUNT
> - [ ] Optimize consolidation frequency (fewer TXs = fewer fees)
> - [ ] Consider batch splits during low gas hours

### UTXO Lifecycle

```
Deposit to Vault
       │
       ▼
┌─────────────────┐
│  Large UTXO     │
│   (e.g., 1 ETH) │
└────────┬────────┘
         │ fund-pool (split)
         ▼
┌─────────────────┐
│  MongoDB Pool   │
│  [utxo_1, ...]  │ ◄── sync-utxos keeps updated
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
 Consumed  Returns
 (spent)   to pool
```

### Environment Variables

```bash
# Sponsor vault
GASLESS_SPONSOR_ADDRESS=0x...
GASLESS_SPONSOR_PK=0x...        # Automatic signer PK

# MongoDB (already exists in worker)
WORKER_MONGO_URI=mongodb://...
```

### Cost per UTXO

> **TODO:** Calculate based on average gas of gasless transactions.
> See "Cost Estimation" section below.

---

## Cost Estimation per UTXO

### Factors that influence gas

| Component | Estimated Gas |
|-----------|---------------|
| Base transaction | ~10,000 |
| Script execution | ~5,000 |
| Predicate verification (BakoSafe) | ~50,000-60,000 |
| Inputs/Outputs | ~1,000 each |
| **Typical total** | **~70,000-80,000 gas** |

### Calculation

```
Average gas per gasless tx: ~80,000
Gas price (Fuel mainnet): ~1 gwei (variable)

Cost per tx = 80,000 * 1 gwei = 0.00008 ETH

With safety margin (2x): 0.00016 ETH
Rounded: 0.0002 ETH per UTXO

In wei: 200,000,000,000,000 (200_000_000_000_000)
```

### Recommended Configuration

```typescript
// Testnet and Mainnet (mandatory dust limit)
UTXO_SPLIT_AMOUNT: '200000000000000',  // 0.0002 ETH (minimum allowed)
```

> **Note:** The 0.0002 ETH dust limit is the same for testnet and mainnet.
> It's not possible to create UTXOs smaller than this value.

### Monthly Cost Estimation

| UTXOs/day | Cost/UTXO | Cost/day | Cost/month |
|-----------|-----------|----------|------------|
| 100 | 0.0002 ETH | 0.02 ETH | 0.6 ETH |
| 500 | 0.0002 ETH | 0.1 ETH | 3 ETH |
| 1000 | 0.0002 ETH | 0.2 ETH | 6 ETH |

> **Note:** These values are estimates. Monitor real usage and adjust.

---

## Phase 4: Gasless API 🔄

### Objective
Create endpoints in the **existing bsafe-api** to support sponsored (gasless) transactions.

### Current Architecture (without gasless)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CURRENT TRANSACTION FLOW                            │
└─────────────────────────────────────────────────────────────────────────────┘

    UI/dApp              SDK (bakosafe)           API (bsafe-api)         Fuel
       │                      │                        │                   │
       │  vault.transaction() │                        │                   │
       │─────────────────────▶│                        │                   │
       │                      │                        │                   │
       │                      │  POST /transaction     │                   │
       │                      │  { name, assets, ... } │                   │
       │                      │───────────────────────▶│                   │
       │                      │                        │── Build TX        │
       │                      │                        │── Save to DB      │
       │                      │  { transaction }       │                   │
       │                      │◀───────────────────────│                   │
       │                      │                        │                   │
       │  User signs          │                        │                   │
       │◀─────────────────────│                        │                   │
       │─────────────────────▶│                        │                   │
       │                      │                        │                   │
       │                      │  POST /transaction/:id/sign                │
       │                      │───────────────────────▶│                   │
       │                      │                        │── Add witness     │
       │                      │                        │                   │
       │                      │                        │ (when threshold)  │
       │                      │                        │──────────────────▶│
       │                      │                        │      Send TX      │
```

### Proposed Architecture (with gasless)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RESPONSIBILITIES                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│        API         │  │       Worker       │  │      MongoDB       │
│  (unchanged)       │  │  (gasless logic)   │  │      (pool)        │
├────────────────────┤  ├────────────────────┤  ├────────────────────┤
│ • Save TX to DB    │  │ • GASLESS_SPONSOR_PK│  │ • Available UTXOs  │
│ • Collect witnesses│  │ • Uses bakosafe SDK│  │ • Locked UTXOs     │
│ • Send to Fuel     │  │ • Reserve UTXO     │  │ • Metadata         │
│                    │  │ • Sign TX          │  │                    │
│                    │  │ • Manage pool      │  │                    │
│                    │  │ • Validate quota*  │  │                    │
└────────────────────┘  └────────────────────┘  └────────────────────┘

* Quota is optional and controlled by Worker if implemented
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      GASLESS FLOW (API + WORKER)                            │
└─────────────────────────────────────────────────────────────────────────────┘

    SDK (client)              API (bsafe-api)              Worker (bsafe-worker)
         │                          │                             │
         │  POST /worker/gasless/reserve                          │
         │  { vaultId }             │                             │
         │─────────────────────────▶│─────────────────────────────▶│
         │                          │                             │── Reserve UTXO
         │                          │                             │── MongoDB find
         │                          │                             │── Lock UTXO
         │                          │  { utxo, sponsorVault }     │
         │                          │◀────────────────────────────│
         │  { utxo, sponsorVault }  │                             │
         │◀─────────────────────────│                             │
         │                          │                             │
         │  SDK builds complete TX  │                             │
         │  (includes sponsor input)│                             │
         │                          │                             │
         │  POST /transaction       │                             │
         │  { tx, isGasless: true,  │                             │
         │    reservationId }       │                             │
         │─────────────────────────▶│                             │
         │                          │  Delegate signing           │
         │                          │────────────────────────────▶│
         │                          │                             │── Uses SDK
         │                          │                             │── Signs with PK
         │                          │  { tx with sponsor sig }    │
         │                          │◀────────────────────────────│
         │                          │── Save TX to DB             │
         │  { transaction }         │                             │
         │◀─────────────────────────│                             │
         │                          │                             │
         │  (collect vault signatures - normal flow)              │
         │                          │                             │
         │                          │  When threshold reached     │
         │                          │────────────────────────────▶│
         │                          │                             │── Send to Fuel
         │                          │                             │── Release UTXO
```

### Modifications to bsafe-api

| Component | Modification |
|-----------|--------------|
| **Tables** | ❌ No changes needed |
| **POST /transaction** | Detect `isGasless` and delegate signing to Worker |
| **Communication** | API → Worker via `/worker/*` path |

### Witness Structure (Gasless)

Witnesses are stored in `transaction.resume.witnesses` (JSONB). For gasless, we use the `isSponsor` tag:

```typescript
// transaction.resume.witnesses for gasless transaction
[
  { account: "0xvault_signer1", signature: "...", status: "DONE", isSponsor: false },
  { account: "0xvault_signer2", signature: null,  status: "PENDING", isSponsor: false },
  { account: "0xsponsor_vault", signature: "...", status: "DONE", isSponsor: true },  // ← LAST
]
```

**Rules:**
- ✅ Sponsor is **always the last** in the witnesses list
- ✅ Sponsor has `isSponsor: true` tag
- ✅ No need to change tables - uses existing JSONB structure
- ✅ Sponsor signature is added by Worker before returning to user

### Modifications to bsafe-worker

| Component | Modification |
|-----------|--------------|
| **Env vars** | `GASLESS_SPONSOR_PK`, `GASLESS_SPONSOR_ADDRESS` |
| **New queue** | `gaslessPool` (sync, cleanup, fund) |
| **New job** | `gasless:sign` - signs TX with sponsor PK using SDK |
| **New job** | `gasless:reserve` - reserves UTXO from MongoDB |
| **SDK** | Uses bakosafe SDK to manipulate TX and sign |
| **HTTP endpoints** | Expose endpoints for SDK direct communication |

### SDK → Worker Communication

The SDK uses a provider that points to the API. The Worker will be accessible via the same domain with an additional path (infra redirect):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PATH-BASED ROUTING                                  │
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

Examples:
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

  // Existing methods (API)
  async createTransaction(...) {
    return this.post('/transaction', ...);
  }

  // New methods (Worker via /worker/*)
  async gaslessReserve(vaultId: string) {
    return this.post('/worker/gasless/reserve', { vaultId });
  }

  async gaslessSign(tx: Transaction, reservationId: string) {
    return this.post('/worker/gasless/sign', { tx, reservationId });
  }
}
```

**Infrastructure:**
- Same domain (`api.bakosafe.com`)
- Path `/worker/*` redirects to Worker
- SDK doesn't need to know they're different services
- Maintains compatibility with existing provider

### Detailed Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GASLESS FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

          SDK                                                  Worker
           │                                                       │
           │  POST /worker/gasless/reserve                         │
           │──────────────────────────────────────────────────────▶│
           │                                                       │── reserveUtxo(MongoDB)
           │    { utxo, sponsorId }  │                           │
           │◀────────────────────────│                           │
           │                         │                           │
           │  [Build TX with sponsor]│                           │
           │                         │                           │
           │  POST /transaction      │                           │
           │  { tx, witnesses,       │                           │
           │    isGasless: true }    │                           │
           │────────────────────────▶│                           │
           │                         │                           │
           │                         │── sign with sponsor PK ───│
           │                         │                           │
           │  POST /worker/gasless/release (or automatic)          │
           │  { utxoId, status }     │                           │
           │──────────────────────────────────────────────────────▶│
           │                         │                           │── releaseUtxo(MongoDB)
           │                         │                           │
```

### Worker Endpoints

> **NOTE:** All gasless endpoints are served by the Worker via `/worker/*` path
> The SDK uses the same domain (`api.bakosafe.com`) and infra redirects.

#### `POST /worker/gasless/reserve`

Reserves a UTXO from the pool for a gasless transaction.

```typescript
// Request
{
  vaultId: string;      // Vault that will receive sponsorship
  estimatedGas?: BN;    // Estimated gas (to choose adequate UTXO)
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
    predicateData: string;    // For SDK to build input
  };
  expiresAt: string;          // ISO timestamp
  reservationId: string;      // For later release
}

// Errors
400: { error: "VAULT_NOT_ELIGIBLE" }     // Vault doesn't have quota
429: { error: "QUOTA_EXCEEDED" }         // Limit reached
503: { error: "POOL_EXHAUSTED" }         // No UTXOs available
```

#### `POST /worker/gasless/release`

Releases a reserved UTXO (success or failure).

```typescript
// Request
{
  reservationId: string;
  status: "completed" | "cancelled" | "failed";
  txHash?: string;            // If completed
  reason?: string;            // If failed/cancelled
}

// Response
{
  success: true;
}
```

#### `GET /worker/gasless/quota/:vaultId`

Checks available quota for a vault.

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

Sponsor pool status (admin/debug).

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

### Modifications to Existing Endpoints

#### `POST /transaction` (existing)

Add support for gasless transactions:

```typescript
// Request (additional fields)
{
  // ... existing fields ...
  isGasless?: boolean;
  gaslessReservationId?: string;    // Reference to reserved UTXO
}

// Additional behavior
if (isGasless && gaslessReservationId) {
  1. Validate reservationId
  2. Get sponsor PK
  3. Sign tx with sponsor
  4. Add signature to witnesses
  5. Mark UTXO as used
}
```

### Tasks

- [ ] Create `GaslessController` in Worker
- [ ] Create `GaslessService` in Worker
- [ ] Implement `POST /worker/gasless/reserve`
- [ ] Implement `POST /worker/gasless/release`
- [ ] Implement `POST /worker/gasless/sign`
- [ ] Implement `GET /worker/gasless/quota/:vaultId`
- [ ] Implement `GET /worker/gasless/status`
- [ ] Add logs/metrics for gasless

---

## Phase 5: SDK Integration 🔄

### Objective
Expose methods in the SDK so developers can easily create gasless transactions.

### Fundamental Principle: Hash Immutability

> **RULE:** Signing only happens when TX assembly is 100% complete.
> No changes can occur after the hash is calculated for signing.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WHAT AFFECTS vs DOESN'T AFFECT THE HASH                  │
└─────────────────────────────────────────────────────────────────────────────┘

        PART OF HASH                       NOT PART OF HASH
        (change = re-sign)                 (can change after)
        ─────────────────                  ─────────────────────
        • inputs                           • witnesses
        • outputs                          • predicateGasUsed
        • maxFee
        • gasLimit
        • script/scriptData
```

**Implication for Gasless:**

```
BEFORE hash (SDK builds):              AFTER hash (Worker adds):
─────────────────────────              ───────────────────────────
✅ Add sponsor input                   ✅ Add sponsor signature
✅ Add sponsor change output              (goes in witnesses array)
✅ Estimate gas/fees
✅ Calculate final hash
                    │
                    ▼
            HASH CALCULATED
            (TX immutable)
                    │
                    ▼
            User signs
            Worker signs (sponsor)
```

### Public API

```typescript
// Simple usage for developer
const tx = await vault.transaction({
  name: 'My transfer',
  assets: [{ assetId, amount, to }],
  gasless: true,                        // ← New option
});

// Return same as normal flow
// { tx, hashTxId, encodedTxId }
```

### Internal SDK Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              FLOW vault.transaction({ gasless: true })                      │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────┐
                    │  PHASE 1: TX ASSEMBLY               │
                    │  (everything that affects hash)     │
                    │  ─────────────────────              │
                    │  SDK is responsible                 │
                    └─────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    │                               │                               │
    ▼                               ▼                               ▼
┌────────────┐              ┌────────────────┐              ┌────────────────┐
│ 1. Reserve │              │ 2. Build TX    │              │ 3. Estimate    │
│    UTXO    │              │    complete    │              │    gas/fees    │
│            │              │                │              │                │
│ Worker     │              │ • vault inputs │              │ • maxFee       │
│ returns    │─────────────▶│ • sponsor input│─────────────▶│ • gasLimit     │
│ sponsorIn- │              │ • outputs      │              │                │
│ put ready  │              │ • change outs  │              │ FINAL HASH     │
└────────────┘              └────────────────┘              └───────┬────────┘
                                                                    │
                    ┌───────────────────────────────────────────────┘
                    │
                    ▼
                    ┌─────────────────────────────────────┐
                    │  PHASE 2: SPONSOR SIGNS FIRST       │
                    │  (before user sees TX)              │
                    └─────────────────────────────────────┘
                                    │
                                    ▼
                    ┌────────────────────────────────────┐
                    │ 4. POST /transaction               │
                    │    { txData, isGasless,            │
                    │      reservationId }               │
                    │                                    │
                    │    API delegates to Worker         │
                    │    ↓                               │
                    │    Worker signs with sponsor PK    │
                    │    ↓                               │
                    │    Saves TX + sponsor witness      │
                    │    (isSponsor: true, last)         │
                    └────────────────────────────────────┘
                                    │
                                    ▼
                    ┌────────────────────────────────────┐
                    │ 5. Returns TX to user              │
                    │    (ALREADY WITH sponsor signature)│
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
                    │  PHASE 3: USER SIGNS                │
                    │  (when threshold → send TX)         │
                    └─────────────────────────────────────┘
                                    │
                                    ▼
                    ┌────────────────────────────────────┐
                    │ 6. User signs                      │
                    │    POST /transaction/:id/sign      │
                    │                                    │
                    │ 7. When threshold reached:         │
                    │    → TX already has sponsor sig    │
                    │    → Send to Fuel Network          │
                    └────────────────────────────────────┘
```

**Flow summary:**
1. SDK builds complete TX (with sponsor input)
2. SDK sends to API
3. **Worker signs BEFORE returning** (sponsor signature already included)
4. User receives TX ready to sign
5. When vault threshold is reached → TX sent (sponsor already signed)

> **UX: Zero wait for user**
>
> The sponsor signs during TX creation (synchronous).
> When the user confirms their signature and threshold is reached,
> the TX is sent **immediately** - no waiting for sponsor signature.

### Worker Interface: Reserve

```typescript
// POST /worker/gasless/reserve

// Request
interface GaslessReserveRequest {
  vaultId: string;
  predicateAddress: string;
}

// Response - Worker returns input READY to add
interface GaslessReserveResponse {
  reservationId: string;
  expiresAt: string;

  // Complete sponsor input (SDK just adds to TX)
  sponsorInput: {
    type: 'coin';
    id: string;
    owner: string;
    amount: string;
    assetId: string;
    txPointer: { blockHeight: number; txIndex: number };
    predicate: string;      // sponsor vault bytecode
    predicateData: string;  // configurable encoded
  };

  // For change output
  sponsorAddress: string;
}
```

### Worker Interface: Sign

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

### SDK Modifications

**1. VaultTransaction type (`types.ts`):**
```typescript
export type VaultTransaction = {
  name?: string;
  assets: ITransferAsset[];
  gasless?: boolean;  // NEW
};
```

**2. Transaction method (`Vault.ts`):**
```typescript
async transaction(params: VaultTransaction) {
  const { assets, gasless } = params;

  // ═══════════════════════════════════════════════════════════════
  // PHASE 1: ASSEMBLY (affects hash)
  // ═══════════════════════════════════════════════════════════════

  let gaslessReservation = null;

  // If gasless, reserve UTXO BEFORE building
  if (gasless && this.provider instanceof BakoProvider) {
    gaslessReservation = await this.provider.service.reserveGasless(
      this.id,
      this.address.toB256()
    );
  }

  // Build TX normally
  const tx = new ScriptTransactionRequest();

  // ... existing code: add vault inputs, outputs ...

  // If gasless, add sponsor (STILL IN ASSEMBLY PHASE)
  if (gaslessReservation) {
    // Add sponsor input (comes ready from Worker)
    tx.inputs.push(gaslessReservation.sponsorInput);

    // Add sponsor change output
    const baseAssetId = await this.provider.getBaseAssetId();
    tx.addChangeOutput(
      Address.fromB256(gaslessReservation.sponsorAddress),
      baseAssetId
    );
  }

  // Populate predicate data
  this.populateTransactionPredicateData(tx);

  // ═══════════════════════════════════════════════════════════════
  // PHASE 2: PREPARATION AND SEND (hash calculated here)
  // ═══════════════════════════════════════════════════════════════

  return this.BakoTransfer(tx, {
    name: params.name,
    isGasless: gasless,
    reservationId: gaslessReservation?.reservationId,
  });
}
```

**3. API Payload (`ICreateTransactionPayload`):**
```typescript
interface ICreateTransactionPayload {
  predicateAddress: string;
  name?: string;
  hash: string;
  txData: TransactionRequest;
  status: TransactionStatus;

  // NEW - Gasless
  isGasless?: boolean;
  gaslessReservationId?: string;
}
```

### Tasks

- [ ] Add `gasless?: boolean` to `VaultTransaction` type
- [ ] Add `reserveGasless()` and `signGasless()` methods to `Service.ts`
- [ ] Modify `vault.transaction()` to support gasless
- [ ] Modify `ICreateTransactionPayload` with gasless fields
- [ ] Integration tests

---

## Phase 6: UI Identification ✅

### Objective
Signal in transaction details that it's sponsored (gasless).

### Identification

The UI identifies gasless transactions through `txData` returned by the API:

```typescript
// Check if transaction is gasless
const isGasless = transaction.resume.witnesses.some(w => w.isSponsor === true);

// Or via dedicated field (if added)
const isGasless = transaction.isGasless;
```

### Display

In transaction details, show simple indication:
- "Gas sponsored by BakoSafe" or similar
- Sponsor address information (optional)

> **Note:** UI implementation details are up to the frontend team.
> This document focuses on backend integration (Worker, SDK, API).

---

## Phase 7: Storage ✅

### Decision: MongoDB (Worker)

For MVP, UTXO and reservation management will be done via **MongoDB**, which the Worker already uses.

### Why MongoDB?

| Aspect | MongoDB | Redis |
|--------|---------|-------|
| **Already in use** | ✅ Worker already uses | Needs to be added |
| **Persistence** | ✅ Data is safe | Volatile (can lose) |
| **Queries** | ✅ Flexible | Limited |
| **Speed** | ~10-50ms | ~1ms |
| **TTL** | ✅ Supports TTL indexes | Native |

**For MVP**, MongoDB is sufficient and avoids adding infrastructure.

> **Future evolution:** If request volume grows significantly,
> Redis can be added as a cache in front of MongoDB to reduce latency.
> The `sync-utxos` job already reconciles with on-chain state, so the architecture
> supports this evolution without major changes.

### MongoDB Structure

```typescript
// Collection: gasless_utxos
{
  _id: ObjectId,
  utxoId: string,           // On-chain UTXO ID
  amount: string,           // Value in wei
  assetId: string,          // Base asset ID
  status: 'available' | 'locked' | 'spent',

  // Lock info (when status = 'locked')
  lockedBy?: {
    vaultId: string,
    reservationId: string,
    expiresAt: Date,
  },

  // Metadata
  createdAt: Date,
  updatedAt: Date,
}

// Indexes
{ status: 1 }                    // Find available
{ "lockedBy.expiresAt": 1 }      // TTL for cleanup
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

// TTL index for auto-expiration
{ expiresAt: 1 }, { expireAfterSeconds: 0 }
```

### Witnesses in API (Postgres)

Sponsor signature information is stored in the existing JSONB structure:

```typescript
// transaction.resume.witnesses (existing JSONB in API)
[
  { account: "0xsigner1", signature: "...", status: "DONE", isSponsor: false },
  { account: "0xsponsor", signature: "...", status: "DONE", isSponsor: true },
]
```

**No need to change API tables** - just add the `isSponsor: true` tag to witnesses.

### Tasks

- [x] Decide storage: MongoDB ✅
- [ ] Create collections in Worker
- [ ] Create indexes (status, TTL)
- [ ] Verify `isSponsor` tag in witnesses JSONB (API)

---

## Phase 8: Rate Limiting & Quotas ⏳ (Post-MVP)

> **STATUS:** Leave for after MVP. Documented here for future reference.
>
> **NOTE:** If quotas are implemented, control should be done by the **Worker**,
> not the API. The Worker is already responsible for all gasless logic (reserve, sign, pool).
> The API maintains only its current role of saving and sending transactions.

### Objective
Control gasless usage per workspace/vault to prevent abuse.

### Why leave for post-MVP?

- MVP will have small pool and controlled usage
- Manual monitoring initially
- Allows validating feature before adding complexity
- Quotas can be adjusted based on real usage

### Quota Rules

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LIMITS PER PLAN                                     │
└─────────────────────────────────────────────────────────────────────────────┘

│ Plan       │ Daily   │ Monthly │ Max per TX │ Notes                        │
├────────────┼─────────┼─────────┼────────────┼──────────────────────────────│
│ Free       │ 5       │ 50      │ 100k gas   │ Basic for testing            │
│ Starter    │ 10      │ 100     │ 200k gas   │ Small projects               │
│ Pro        │ 50      │ 500     │ 500k gas   │ Production                   │
│ Enterprise │ Custom  │ Custom  │ Custom     │ Negotiated                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Validation

```typescript
// Validation middleware
async function validateGaslessQuota(
  vaultId: string,
  workspaceId: string
): Promise<boolean> {
  const workspace = await getWorkspace(workspaceId);
  const quota = await getQuotaForPlan(workspace.plan);
  const usage = await getUsageForToday(workspaceId);

  // Validations
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

### Quota Increment

```typescript
// After successful gasless transaction
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

### Tasks

- [ ] Create `GaslessQuotaService`
- [ ] Implement validation middleware
- [ ] Create quota query endpoints
- [ ] Add usage tracking
- [ ] Logs/alerts for quotas near limit

---

## Phase 9: Sponsor Predicate ⏳ (Future)

### Objective
Create custom Sway predicate for the sponsor pool (optional, future improvement).

### Proposed Features

- Validate paymaster signature
- Limit max gas per transaction
- Verify authorized vaults (whitelist)
- Anti-replay (nonce)

### Note

> For MVP, we use a BakoSafe 1/5 Vault as sponsor.
> A custom predicate will only be needed if we want more complex rules
> like gas limits or whitelist of authorized vaults.

### Tasks

- [ ] Evaluate need after MVP validation
- [ ] Define intent structure
- [ ] Implement predicate in Sway
- [ ] Predicate tests
- [ ] Integrate with Gasless API

---

## Phase 10: Owner Policy ⏳

### Objective
Use Owner Policy when available to define who is the "owner" of the transaction.

### Dependency
- fuel-core v0.47+ (merged, awaiting release)
- fuels-ts with `ownerInputIndex` support

### Benefit
```typescript
tx.ownerInputIndex = 0; // Vault is the "owner" even with sponsor paying gas
// msg_sender() in contracts returns the vault, not the sponsor
```

### Tasks

- [ ] Wait for fuel-core v0.47 release
- [ ] Update fuels-ts
- [ ] Implement ownerInputIndex usage
- [ ] Update tests

---

## Sponsor Vault - Architecture

### MVP: Simplified 1/5 Vault

For initial validation, the sponsor will be a **BakoSafe 1/5 Vault**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SPONSOR VAULT (MVP)                          │
│                         1/5                                     │
└─────────────────────────────────────────────────────────────────┘

Signers:
├── [1] Worker Signer (private key in Worker) ─── Automatic signing
├── [2] Passkey Admin 1 ──────────────────────── View/Backup
├── [3] Passkey Admin 2 ──────────────────────── View/Backup
├── [4] Passkey Admin 3 ──────────────────────── View/Backup
└── [5] Passkey Admin 4 ──────────────────────── View/Backup

Threshold: 1 of 5
└── Worker signs alone, instant
```

**MVP Benefits:**
- One signature = zero latency
- Passkeys allow admins to view all txs
- Manual backup available if API fails
- Zero additional infrastructure

**Sponsor Identification:**
- Vault tag: `BAKO_GASLESS_SPONSOR_V1`
- UI can display: "Gas sponsored by BakoSafe"

### ⚠️ Security Considerations (Post-MVP)

> **ALERT:** The MVP architecture keeps the sponsor private key in the Worker.
> This is acceptable for validation but should be improved before large-scale production.

**MVP Risks:**
- Worker compromise exposes sponsor key
- All pool funds could be drained
- No segregation of responsibilities

**Recommended Architecture for Production:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SECURE ARCHITECTURE (POST-MVP)                           │
│                    Distributed Sponsor Vault 2/3                            │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │    Worker    │
                              │ (orchestrator│
                              │  no keys)    │
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

**Distributed Signing Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLOW: WORKER ORCHESTRATES SIGNERS                        │
└─────────────────────────────────────────────────────────────────────────────┘

Worker                    Signer A              Signer B              Signer C
   │                         │                     │                     │
   │  POST /sign             │                     │                     │
   │  { txHash, vaultId }    │                     │                     │
   │────────────────────────▶│                     │                     │
   │                         │── Validate request  │                     │
   │                         │── Rate limit check  │                     │
   │                         │── Sign with PK_A    │                     │
   │  { signature_A }        │                     │                     │
   │◀────────────────────────│                     │                     │
   │                         │                     │                     │
   │  POST /sign             │                     │                     │
   │  { txHash, vaultId }    │                     │                     │
   │─────────────────────────────────────────────▶│                     │
   │                         │                     │── Validate request  │
   │                         │                     │── Rate limit check  │
   │                         │                     │── Sign with PK_B    │
   │  { signature_B }        │                     │                     │
   │◀─────────────────────────────────────────────│                     │
   │                         │                     │                     │
   │  Threshold reached (2/3)                      │                     │
   │  Build witnesses with signature_A + signature_B                     │
   │                         │                     │                     │
```

**Secure Architecture Components:**

| Component | Responsibility | Location |
|-----------|----------------|----------|
| **Worker** | Orchestrates requests, HAS NO keys | Main server |
| **Signer A** | Holds PK_A, validates and signs | us-east (AWS/GCP) |
| **Signer B** | Holds PK_B, validates and signs | eu-west (AWS/GCP) |
| **Signer C** | Holds PK_C in HSM/KMS | Dedicated HSM |
| **Sponsor Vault** | 2/3 Vault on-chain | Fuel Network |

**Each Signer Service should:**

```typescript
// signer-service/src/sign.ts

async function handleSignRequest(req: SignRequest): Promise<SignResponse> {
  // 1. Validate origin (mTLS or API key)
  validateOrigin(req.headers);

  // 2. Independent rate limiting
  await rateLimiter.check(req.vaultId);

  // 3. Validate txHash is for authorized vault
  await validateVaultAuthorization(req.vaultId);

  // 4. Log for audit
  await auditLog.record({
    action: 'SIGN_REQUEST',
    txHash: req.txHash,
    vaultId: req.vaultId,
    timestamp: Date.now(),
  });

  // 5. Sign
  const signature = await signWithPK(req.txHash);

  // 6. Return encoded signature
  return {
    signature: encodeBAKOSignature(SIGNER_ADDRESS, signature),
  };
}
```

**Security Improvements:**

| Improvement | Description | Benefit |
|-------------|-------------|---------|
| **Geographic isolation** | Each signer in different region | Compromise of 1 doesn't affect others |
| **HSM/KMS** | At least 1 signer uses hardware | Key never exposed in memory |
| **mTLS** | Worker ↔ Signers communication | Mutual authentication |
| **Rate limit per signer** | Each signer validates independently | Defense in depth |
| **Audit logs** | Independent logs per signer | Complete traceability |
| **Vault 2/3** | Requires 2 of 3 signatures | Tolerance for 1 signer failure |

**When to migrate to this architecture:**
- [ ] After validating MVP with real users
- [ ] Before significantly increasing pool funds
- [ ] When transaction volume justifies cost
- [ ] If there are compliance requirements (SOC2, etc.)

---

## Technical Context: witness_index in Predicates

### How witness_index works

Predicates need to know where to fetch the signature in the transaction's witnesses array. There are two different approaches in BakoSafe:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PREDICATE TYPES AND WITNESS_INDEX                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐     ┌─────────────────────────────┐
│   CONNECTOR PREDICATES      │     │     BAKO PREDICATES         │
│   (EVM, SVM, WebAuthn)      │     │     (Fuel origin)           │
├─────────────────────────────┤     ├─────────────────────────────┤
│                             │     │                             │
│  main(witness_index: u64)   │     │  main() // no parameter     │
│         ↓                   │     │         ↓                   │
│  tx_witness_data(0)         │     │  iterates ALL witnesses     │
│         ↓                   │     │  looking for BAKO prefix    │
│  Fetches from witnesses[0]  │     │         ↓                   │
│                             │     │  Finds by prefix            │
└─────────────────────────────┘     └─────────────────────────────┘
```

### Connector Predicates: fixed witness_index

Fuel origin predicates (EVM, SVM, WebAuthn) receive `witness_index` as parameter:

```sway
// Sway Predicate (Connector)
fn main(witness_index: u64) -> bool {
    let signature = tx_witness_data(witness_index);
    // Validate signature...
}
```

In the SDK, this value is passed via `data` at instantiation:

```typescript
// VaultConfigurationFactory.ts - line 64
static createConnectorConfiguration(...) {
  return {
    config: { SIGNER: ... },
    data: [0],  // ← witness_index = 0 (HARDCODED)
  };
}
```

**Flow:**
```
SDK                          Predicate
 │                              │
 │  data: [0]                   │
 │  ──────────────────────────▶ │
 │                              │  Encoded as predicateData
 │                              │  in TX input
 │                              │
 │                              │  main(witness_index = 0)
 │                              │  tx_witness_data(0)
 │                              │  ↓
 │                              │  Fetches witnesses[0]
```

### Bako Predicates: iterates all witnesses

BakoSafe predicates (multisig) DO NOT use witness_index as parameter. They iterate through ALL witnesses looking for the BAKO prefix (`0x42414b4f`):

```typescript
// VaultConfigurationFactory.ts - line 37
static createBakoConfiguration(...) {
  return {
    config: { SIGNERS, SIGNATURES_COUNT, HASH_PREDICATE },
    // NO data - doesn't use witness_index
  };
}
```

**That's why the BakoSafe predicate finds its signature regardless of position in the array.**

### Implications for Gasless

| Scenario | Vault | Sponsor | Works? |
|----------|-------|---------|--------|
| MVP | Bako (multisig) | Bako 1/5 | ✅ Both iterate all witnesses |
| Future | Connector | Bako | ✅ Connector at [0], Bako finds at any position |
| Future | Bako | Connector | ⚠️ Problem if sponsor not at [0] |
| Future | Connector | Connector | ⚠️ Both fetch from [0] - conflict! |

### Witness Structure for Gasless

**MVP Scenario (Bako + Bako):**
```
witnesses:
├── [0] Vault signatures (BAKO encoded) ← Vault finds by prefix
├── [1] ... more vault signatures
└── [N] Sponsor signature (BAKO encoded) ← Sponsor finds by prefix

✅ Order doesn't matter - both use BAKO prefix
```

**Future Scenario (Connector vault + Bako sponsor):**
```
witnesses:
├── [0] Vault signature ← Connector fetches here (hardcoded)
└── [1] Sponsor signature (BAKO encoded) ← Bako finds by prefix

✅ Works - each one finds its signature
```

**Problematic Scenario (Bako vault + Connector sponsor):**
```
witnesses:
├── [0] Vault signatures (BAKO encoded)
└── [1] Sponsor signature ← Connector fetches from [0], doesn't find! ❌

❌ Connector Sponsor doesn't find its signature
```

### Future Solution (if needed)

To support Connector as sponsor, it would be necessary to:

1. **Make witness_index configurable** in SDK (not hardcoded)
2. **Or reorganize witnesses** so Connector sponsor is at [0]
3. **Or modify the predicate** Connector to accept dynamic index

> **For MVP:** Using Bako 1/5 as sponsor, there's no problem.
> This limitation only affects future scenarios with Connector as sponsor.

---

## Technical Challenges

### 1. Sponsor UTXO must be in TX before signing

**Problem:** The transaction hash includes `inputs`. If we add the sponsor UTXO after the user signed, the hash changes and the signature becomes invalid.

**What IS part of the hash:**
- `inputs` (including UTXOs)
- `outputs`
- `maxFee`
- `gasLimit`

**What is NOT part of the hash:**
- `predicateGasUsed`
- `witnesses`

**Required flow:**
```
1. SDK requests sponsor UTXO from Worker
2. SDK builds tx WITH sponsor input included
3. User signs (hash already includes sponsor)
4. Collect remaining signatures (if multisig)
5. estimatePredicates with real witnesses
6. Send
```

### 2. Sponsor UTXO stays locked during signature collection

**Problem:** Multisig transactions (2/2, 3/5, etc.) may take hours or days to collect all signatures. During this time, the sponsor UTXO is "reserved" and cannot be used in other transactions.

**Problematic scenario:**
```
T+0:   Tx created, sponsor UTXO reserved
T+1h:  Signer 1 signs
T+24h: Signer 2 hasn't signed yet
       → UTXO locked for 24h+
       → Sponsor pool may exhaust
```

**Possible solutions:**

| Solution | Pros | Cons |
|----------|------|------|
| **Large UTXO pool** | Simple | Idle capital cost |
| **Timeout + release** | Frees resources | Tx may fail if expires |
| **Sponsor only at end** | UTXO locked briefly | Everyone needs to re-sign after adding sponsor |
| **Two flows** | Optimized per case | Complexity |

**Flow with re-signing (sponsor at end):**
```
1. SDK builds tx WITHOUT sponsor
2. Signers sign (hash A)
3. When all signatures collected:
   a. SDK/Worker adds sponsor input
   b. Hash changes to B
   c. All signers re-sign (hash B)
   d. Send
```

**Flow with timeout:**
```
1. SDK requests UTXO with TTL (e.g., 1h)
2. Build tx WITH sponsor
3. If not completed in 1h:
   a. UTXO released
   b. Tx needs to be recreated with new UTXO
```

### 3. Pending Architectural Decision

**Question:** Which flow to adopt for multisig gasless?

- [ ] Large pool + timeout
- [ ] Re-signing at end
- [ ] Hybrid (short timeout + option to re-sign)
- [ ] Other

---

## Implementation Order (MVP)

Priority to enable MVP:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        IMPLEMENTATION ORDER                                 │
└─────────────────────────────────────────────────────────────────────────────┘

1. WORKER - MongoDB Pool (Phase 3 + 7)
   └── Create collections gasless_utxos, gasless_reservations
   └── Create indexes (status, TTL)
   └── Create gaslessPool queue (Bull)
   └── Jobs: sync-utxos, cleanup-expired
   └── (fund-pool can be manual initially)

2. WORKER - HTTP Endpoints (Phase 4)
   └── POST /worker/gasless/reserve
   └── POST /worker/gasless/release
   └── POST /worker/gasless/sign
   └── GET /worker/gasless/status

3. SDK (Phase 5)
   └── Add methods to BakoProvider
   └── Modify vault.transaction({ gasless: true })

4. UI (Phase 6)
   └── "Gasless" badge in TX details
   └── Identify via isSponsor tag in witnesses

5. RATE LIMITING (Phase 8) - Post-MVP
   └── Quota validation in Worker
   └── Counters in MongoDB (or Redis for high scale)
```

### MVP Checklist

- [ ] **MongoDB**: Collections and indexes created
- [ ] **Worker**: gaslessPool queue running
- [ ] **Worker**: HTTP endpoints working
- [ ] **SDK**: Gasless method available
- [ ] **E2E**: Complete test vault → gasless → receiver
- [ ] **Deploy**: Environment variables configured
- [ ] **Funding**: Sponsor vault with sufficient funds

---

## Changelog

### 2026-02-03 (cont. 2)
- ✅ Documented Phase 4: Gasless API (detailed endpoints)
- ✅ Documented Phase 5: SDK Integration (public API)
- ✅ Documented Phase 6: UI Identification
- ✅ Documented Phase 7: Database Schema
- ✅ Documented Phase 8: Rate Limiting & Quotas
- ✅ Reorganized phases (9 = Sponsor Predicate, 10 = Owner Policy)
- ✅ Added "Implementation Order" section

### 2026-02-03 (cont.)
- ✅ Documented Sponsor Vault architecture (MVP 1/5)
- ✅ Documented security alerts and post-MVP architecture
- ✅ Analyzed current API and SDK flow for integration

### 2026-02-03
- ✅ Created `sendSponsored()` helper for Wallet sender
- ✅ Created `sendSponsoredFromVault()` helper for Vault sender
- ✅ Simplified ALL 3 tests using helpers
- ✅ Test file reduced from ~270 to ~183 lines (32% smaller)
- ✅ All 3 tests passing

### 2025-02-03
- ✅ Created test for Vault 2/2 as sponsor
- ✅ Discovered that `maxFee` is part of hash (requires re-signing)
- ✅ Documented BakoSafe predicate behavior with multiple witnesses
- ✅ Created branch `test/sponsored-transactions-vault-sponsor`
- ✅ Updated context in `bakosafe-context` repo

---

## References

- [Gasless Planning Doc](https://github.com/infinitybase/bakosafe-context/blob/main/gasless-fuel-planning.md)
- [fuel-specs #618 - Owner Policy](https://github.com/FuelLabs/fuel-specs/pull/618)
- [fuels-ts #3950 - Owner Policy Support](https://github.com/FuelLabs/fuels-ts/pull/3950)
- [Fuel Station - Gas Paymaster](https://forum.fuel.network/t/fuel-station-gas-paymaster-on-fuel/7078)
