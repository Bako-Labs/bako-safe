# 🔐 Complete Guide: Generating and Publishing New Predicate Versions

## 📚 Table of Contents

1. [Fundamental Concepts](#fundamental-concepts)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step: Generate New Version](#step-by-step-generate-new-version)
4. [Step-by-Step: Publish Version](#step-by-step-publish-version)
5. [Verification and Validation](#verification-and-validation)
6. [Troubleshooting](#troubleshooting)
7. [FAQ](#faq)

---

## 🎓 Fundamental Concepts

### What is a Predicate?

A **predicate** is a special type of Fuel smart contract that works as a mathematical function to validate transactions. Think of it as an "intelligent digital signature" that verifies if a transaction meets certain rules before it's executed.

**Analogy:**

- Regular bank account: password verification
- Bako Safe Predicate: multiple signatures verification (multi-sig)

### What is a Root Predicate?

When you compile Sway code, the compiler generates **bytecode** - which is the machine language code that Fuel understands. The **root predicate** is a unique identifier (hash) of this bytecode.

```
Sway Code → Compilation → Bytecode → Hash → Root Predicate
                                        (0x0111776e992751...)
```

### What is versions.json?

It's a file that registers all the predicate versions you've created, maintaining a history with:

- Version hash (root predicate)
- Compiled bytecode
- ABI (Application Binary Interface)
- Metadata (description, signatories, networks where deployed)

---

## ✅ Prerequisites

Before you begin, make sure you have:

### 1. Fuel Toolchain Installed

```bash
# Check if installed
fuel --version
forc --version
fuelup --version

# If not, install:
# https://docs.fuel.network/guides/installation/
```

**Recommended versions:**

- `fuel-core@0.43.1`
- `forc@0.68.1`
- `fuels-ts@0.101.3`

### 2. Node.js and PNPM

```bash
# Check Node version
node --version  # Minimum v18.0.0

# Check PNPM
pnpm --version  # Minimum v8.0.0
```

### 3. .env File Configured

```bash
cd packages/sway
cp .env.example .env
```

Edit the `.env` with your credentials:

```bash
# .env
# Private key of the account that will perform the deployment
PRIVATE_KEY=your_private_key_here

# Provider URL for the network where the predicate will be deployed
# Examples:
# - Fuel Testnet: https://testnet.fuel.network/graphql
# - Fuel Mainnet: https://mainnet.fuel.network/graphql
# - Local node: http://localhost:4000/graphql
PROVIDER_URL=https://testnet.fuel.network/graphql
```

### 4. Dependencies Installed

```bash
# At the project root
pnpm install

# Or specifically in packages/sway
cd packages/sway
pnpm install
```

---

## 🚀 Step-by-Step: Generate New Version

### What You'll Do Here

You will:

1. ✏️ Modify the predicate code (Sway)
2. 🔨 Compile the new code
3. 📝 The system automatically generates the entry in `versions.json`
4. ✅ Validate that everything was created correctly
5. 🏷️ Add wallet origin and developer metadata
6. 📝 Document the change with a description
7. 📦 Register the bytecode in ENCODING_VERSIONS
8. (Optional) Update the default predicate version if this is the latest stable version

### Step 1: Understand the Predicate Structure

```
packages/sway/
├── predicate/
│   ├── Forc.toml          # Predicate project configuration
│   └── src/
│       └── main.sw         # ← Main predicate code you'll edit
├── libraries/
│   ├── Forc.toml          # Shared libraries configuration
│   └── src/
│       ├── main.sw         # Library exports
│       ├── entities.sw     # Data structures and types
│       ├── validations.sw  # Validation logic
│       ├── utilities.sw    # Utility functions
│       └── webauthn_digest.sw  # WebAuthn functionality
├── scripts/
│   ├── makeVersion.ts      # ← Script that generates new versions.json
│   ├── getFuelToolchain.ts
│   └── setNetworkDeployed.ts
fuels.config.ts            # Fuel SDK configuration
package.json               # npm package metadata
```

### Step 2: Understand Key Files and Make Your Changes

The main files you'll interact with:

- **`packages/sway/src/predicate/src/main.sw`** - The primary predicate logic (what you'll edit)
- **`packages/sway/src/libraries/src/*.sw`** - Supporting libraries for signature validation, entities, and utilities

Open the predicate's main file in VS Code:

```bash
# In VS Code or your editor
code packages/sway/src/predicate/src/main.sw
```

**Example change:** Let's add a comment describing the audit fix:

```sway
// filepath: packages/sway/src/predicate/src/main.sw

// Existing code before
// ... existing code ...

// Add a comment describing your change
configurable {
    /// Array of authorized signers
    SIGNERS: [b256; 10] = [
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
    ],
    // ... rest of code ...
}

pub fn main() -> bool {
    // Audit fix (2025-03-06): Improved signature validation
    // Ensure all signers are properly validated before execution
    validate_signatures()
}

// ... rest of code ...
```

**⚠️ IMPORTANT:** Any change in the code will generate different bytecode, resulting in a **new root predicate**.

### Step 3: Compile the Code (Build)

Now let's compile to generate the new bytecode:

```bash
# Navigate to the sway directory
cd packages/sway

# Execute the build
pnpm fuels build
```

**What happens in this command:**

```
pnpm fuels build
    ↓
1. Forc compiles Sway → Generates bytecode
    ↓
2. TypeScript processes generated bytecode
    ↓
3. makeVersion.ts is executed automatically
    ↓
4. Calculates new root predicate (unique hash)
    ↓
5. Verifies if this version already exists in versions.json
    ↓
6. If NOT exists → CREATES new entry
   If ALREADY exists → Does nothing (to avoid duplicates)
```

**Expected output:**

```bash
$ pnpm fuels build

> @bako-labs/bako-safe-sway@0.1.0 fuels build
> npm run predicate:build && npm run predicate:abi

> • Compiling library "bako_safe"
> • Finished compilation for library "bako_safe"
> • Compiling predicate "bako_safe"
> • Finished compilation

✅ [BUILD] New predicate version created: 0xabcd1234...
```

### Step 4: Verify if Version Was Created

Open the `versions.json` file and look for the new entry:

```bash
# View the file
cat packages/sdk/src/sway/predicates/versions.json | jq 'keys | .[-1]'

# Or in VS Code
code packages/sdk/src/sway/predicates/versions.json
```

**You should see something like this:**

```json
{
  "0xabcd1234def5678910abcdef1234567890abcdef1234567890abcdef12345678": {
    "time": 1741207200000,
    "bytecode": "0x1a403000...",
    "abi": {
      "programType": "predicate",
      "specVersion": "1",
      "functions": [
        {
          "name": "main",
          "inputs": [],
          "output": "bool"
        }
      ],
      "configurables": [...]
    },
    "toolchain": {
      "fuelsVersion": "0.101.3",
      "forcVersion": "0.68.1",
      "fuelCoreVersion": "0.43.1"
    },
    "description": "",
    "deployed": []
  }
}
```

### Step 5: Add walletOrigin and developedBy Manually (⭐ IMPORTANT!)

The script automatically generates `walletOrigin` and `developedBy` with default values, but **you should adjust them as needed**.

**Open the file and edit:**

```json
{
  "0xabcd1234def5678910abcdef1234567890abcdef1234567890abcdef12345678": {
    "time": 1741207200000,
    "bytecode": "0x1a403000...",
    "abi": { ... },
    "toolchain": { ... },
    "walletOrigin": ["fuel", "webauthn"],  // ← Define which wallets can sign
    "developedBy": "Bako Labs",             // ← Indicate who developed
    "description": "",
    "deployed": []
  }
}
```

**Available fields for `walletOrigin`:**

```json
"walletOrigin": [
  "fuel",          // FuelWallet and Fuelet (native Fuel wallets)
  "webauthn",      // WebAuthn for biometric authentication
  "evm"            // Ethereum signatures (EVM)
]
```

**Examples:**

```json
// Fuel only
"walletOrigin": ["fuel"]

// WebAuthn only
"walletOrigin": ["webauthn"]

// Fuel + WebAuthn (most common)
"walletOrigin": ["fuel", "webauthn"]

// EVM only
"walletOrigin": ["evm"]

// All
"walletOrigin": ["fuel", "webauthn", "evm"]
```

**Available fields for `developedBy`:**

```
"developedBy": "Bako Labs"          // → Predicate created by Bako Labs
"developedBy": "Fuel Labs"          // → Predicate created by Fuel Labs
"developedBy": "Community"          // → Community-contributed predicates
"developedBy": "Your Name"          // → Could be your name in case of contribution
```

### Step 6: Add Description

The description starts empty. You should fill it manually to document what the change was:

**Open the file and edit:**

```json
{
  "0xabcd1234def5678910abcdef1234567890abcdef1234567890abcdef12345678": {
    "time": 1741207200000,
    "bytecode": "0x1a403000...",
    "abi": { ... },
    "toolchain": { ... },
    "walletOrigin": ["fuel", "webauthn"],
    "developedBy": "Bako Labs",
    "description": "Audit fix: improved signature validation and enhanced security checks",
    "deployed": []
  }
}
```

**Best practices for description:**

- ✅ "Improved signature validation"
- ✅ "Added input validation checks"
- ✅ "Optimized gas usage in main function"
- ❌ "v2" (too vague)
- ❌ "fix" (no details)

### Step 7: Register Bytecode in ENCODING_VERSIONS

The `ENCODING_VERSIONS` tracks predicate bytecodes for signature encoding compatibility. You need to add your new bytecode to the appropriate array:

**Open the file:**

```bash
code packages/sdk/src/modules/coders/utils/versionsByEncode.ts
```

**Locate the ENCODING_VERSIONS object:**

```typescript
export const ENCODING_VERSIONS = {
  with0xPrefix: [
    '0xbbae06500cd11e6c1d024ac587198cb30c504bf14ba16548f19e21fa9e8f5f95',
    '0xfdac03fc617c264fa6f325fd6f4d2a5470bf44cfbd33bc11efb3bf8b7ee2e938',
  ],
  without0xPrefix: [
    '0x0111776e992751bd0928862c2a2cb9ea34b220c0ca8833ecbe5f8963805ee8c7',
    // ... more versions
  ],
};
```

**Add your new version bytecode:**

Determine which array to use based on your signature type:

- **`with0xPrefix`**: Use for EVM signatures (Ethereum-compatible)
- **`without0xPrefix`**: Use for Fuel native signatures and WebAuthn

**Example (add to without0xPrefix):**

```typescript
without0xPrefix: [
  '0x0111776e992751bd0928862c2a2cb9ea34b220c0ca8833ecbe5f8963805ee8c7',
  // ... existing entries
  '0xabcd1234def5678910abcdef1234567890abcdef1234567890abcdef12345678', // ← Add here
],
```

**⚠️ IMPORTANT:** The bytecode must match exactly the value from `versions.json`.

### Step 8: Update DEFAULT_PREDICATE_VERSION (Optional - for latest version only)

If your new version is the **latest and most stable** version, update the default version used by the SDK:

**Open the file:**

```bash
code packages/sdk/src/sway/predicates/predicateFinder.ts
```

**Locate the constant:**

```typescript
/** Default predicate bytecode version used when none is specified. */
export const DEFAULT_PREDICATE_VERSION =
  `0x0111776e992751bd0928862c2a2cb9ea34b220c0ca8833ecbe5f8963805ee8c7` as const;
```

**Replace with your new version:**

```typescript
/** Default predicate bytecode version used when none is specified. */
export const DEFAULT_PREDICATE_VERSION =
  `0xabcd1234def5678910abcdef1234567890abcdef1234567890abcdef12345678` as const;
```

**⚠️ CAUTION:** Only update this if:

- ✅ You've tested thoroughly on testnet
- ✅ The SDK passes all tests with this version
- ✅ It's backwards compatible
- ✅ Multiple versions are still available for fallback in `versions.json`

**❌ DO NOT update if:**

- The version hasn't been deployed to mainnet
- You're just doing development/testing
- There are known issues

---

## 📤 Step-by-Step: Publish Version

### What You'll Do Here

You will:

1. 🔓 Unlock credentials (if necessary)
2. 📡 Send the bytecode to the Fuel network
3. ✅ Register the network in `versions.json`
4. 🎉 Confirm the deployment was successful

### Prerequisite: Configure .env

Open the `.env` file:

```bash
cd packages/sway
nano .env  # or use your favorite editor
```

Configure with your credentials:

```bash
# .env
# Private key of the account that will perform the deployment
# ⚠️ NEVER commit this!
PRIVATE_KEY=0x1234567890abcdef...
```

**⚠️ SECURITY:**

- Never share your `PRIVATE_KEY`
- Never commit the `.env` file
- Use a testnet account for testing
- For mainnet, consider using an account with minimal funds or hardware wallet

### Step 1: Check Balance (if necessary)

If you're using testnet, you can request test funds:

```bash
# Not necessary to run every time, but good to check
# On Fuel Testnet: https://faucet.testnet.fuel.network/
# You need ETH on testnet to pay for gas
```

### Step 2: Execute the Deployment

```bash
cd packages/sway

# Deployment command
pnpm predicate:deploy
```

**What happens:**

```
pnpm predicate:deploy
    ↓
1. Reads the .env file
    ↓
2. Loads the predicate bytecode
    ↓
3. Connects to the specified Fuel network
    ↓
4. Sends a transaction with the bytecode
    ↓
5. Waits for network confirmation
    ↓
6. Returns transaction ID (tx hash)
```

**Expected output:**

```bash
$ pnpm predicate:deploy

> @bako-labs/bako-safe-sway@0.1.0 predicate:deploy
> tsx scripts/setNetworkDeployed.ts

✅ Deploy successful!
Transaction ID: 0x1a2b3c4d5e6f7g8h...
```

### Step 3: Verify the Deployment

The `setNetworkDeployed.ts` script automatically registers that your predicate has been deployed to the specified network. Simply verify that the network URL was added successfully:

```bash
# View the deployed networks for your predicate
jq '.["0xabcd1234..."].deployed' packages/sdk/src/sway/predicates/versions.json

# or view the complete version entry
jq '.["0xabcd1234..."]' packages/sdk/src/sway/predicates/versions.json
```

**Expected result:**

```json
{
  "time": 1741207200000,
  "bytecode": "0x1a403000...",
  "abi": { ... },
  "toolchain": { ... },
  "walletOrigin": ["fuel", "webauthn"],
  "developedBy": "Bako Labs",
  "description": "Audit fix: improved signature validation and enhanced security checks",
  "deployed": [
    "https://testnet.fuel.network/v1/graphql"
  ]
}
```

✅ If you see your network URL in the `deployed` array, the deployment was registered successfully!

### Step 4: Commit the Changes

The deployment script has automatically updated `versions.json` with your network. Now commit these changes:

```bash
git add packages/sdk/src/sway/predicates/versions.json

git commit -m "chore: add new predicate version and register deployment on testnet"

git push origin your-branch-name
```

**📝 Note:** This commit includes both the new version entry (from `makeVersion.ts`) and the network deployment (from `setNetworkDeployed.ts`).

### Step 5: Publish to NPM (Optional - only for official releases)

If you want to make this version available for other developers to use:

```bash
# Update the package version
npm version patch  # 0.1.0 → 0.1.1
# or
npm version minor  # 0.1.0 → 0.2.0

# Publish to npm
npm publish

# This will push with tags automatically
```

**⚠️ Only do this if you are a maintainer of the project!**

---

## ✅ Verification and Validation

### How to Confirm Everything Worked?

#### 1. Verify versions.json

```bash
# List all created versions
jq 'keys' packages/sdk/src/sway/predicates/versions.json

# View details of a specific version
jq '.["0xabcd1234..."]' packages/sdk/src/sway/predicates/versions.json
```

**Expected result:**

```json
{
  "time": 1741207200000,
  "bytecode": "0x1a403000504100...",
  "abi": { "programType": "predicate", ... },
  "toolchain": { "fuelsVersion": "0.101.3", ... },
  "walletOrigin": ["fuel", "webauthn"],
  "developedBy": "Bako Labs",
  "description": "Audit fix: improved signature validation",
  "deployed": ["https://testnet.fuel.network/v1/graphql"]
}
```

#### 2. Check on the Blockchain Explorer

```bash
# Go to the Fuel Explorer (if deployed)
# https://testnet.fuel.network/

# Search for your Transaction ID
# You should see the transaction confirmation
```

#### 3. Test the SDK with the New Version

```bash
# In your project using bako-safe SDK
import { BakoSafe } from '@bako-labs/sdk';

// The SDK automatically recognizes the new version
const vault = new BakoSafe({
  provider,
  predicate: '0xabcd1234...' // your new version
});
```

#### 4. Run Tests

```bash
cd packages/tests

# Run tests to ensure compatibility
pnpm test

# Or specific tests
pnpm test:file predicate.test.ts
```

---

## 🆘 Troubleshooting

### ❌ Error: "Could not find root predicate"

**Cause:** The bytecode was not generated correctly.

**Solution:**

```bash
# Clean cache and rebuild
rm -rf packages/sway/out
pnpm install
pnpm fuels build
```

---

### ❌ Error: "Version already exists"

**Cause:** You didn't make real changes to the code, the bytecode is the same.

**Solution:**

```bash
# Make a real change to the Sway code
# For example, add a comment or change logic

# Then execute again
pnpm fuels build
```

---

### ❌ Error: "Private key not found in .env"

**Cause:** The `.env` file was not configured correctly.

**Solution:**

```bash
# Check if .env exists
cat packages/sway/.env

# If it doesn't exist, create it:
cd packages/sway
cp .env.example .env

# Edit with your credentials
nano .env
```

---

### ❌ Error: "Insufficient balance for gas"

**Cause:** Your account doesn't have enough balance on the testnet.

**Solution:**

```bash
# For testnet, request free funding from the faucet
# https://faucet.testnet.fuel.network/

# Paste your public address
# Wait to receive test ETH
```

---

### ❌ Error: "Failed to compile predicate"

**Cause:** There's a syntax error in the Sway code.

**Solution:**

```bash
# Check the compilation error
pnpm fuels build 2>&1 | grep -i error

# Fix the syntax
# Sway Documentation: https://docs.fuel.network/
```

---

## ❓ FAQ

### Q: How many versions can I have?

**A:** As many as you want! Each code change = new version. You can have 100+ different versions.

---

### Q: Can I revert to an old version?

**A:** Yes! Each version has its own hash. You can specify which version to use when creating a vault:

```typescript
const vault = BakoSafe.deploy({
  provider,
  predicate: '0x[old-version-hash]',
});
```

---

### Q: What's the difference between testnet and mainnet?

| Aspect     | Testnet                 | Mainnet         |
| ---------- | ----------------------- | --------------- |
| Purpose    | Testing and development | Real production |
| Real funds | No (fake ETH)           | Yes (real ETH)  |
| Risk       | None                    | High            |
| Speed      | Faster                  | Depends         |
| Tx cost    | Free/testnet            | Real money      |

---

### Q: What does "walletOrigin" mean?

**A:** Which supported wallets can sign with your predicate.

```json
"walletOrigin": ["fuel", "webauthn"]
// Means: FuelWallet and WebAuthn can sign
```

---

### Q: Do I need to deploy every time I make a change?

**A:** No! You:

1. ✅ **Must** run `pnpm fuels build` (always)
2. ❓ **Can** deploy (only when ready)
3. ✅ **Must** update `versions.json` (always)

Deployment is optional - you only do it when you want to publish to a network.

---

### Q: Can I have multiple versions deployed to different networks?

**A:** Yes! Example:

```json
{
  "0xversion1": {
    "deployed": ["https://testnet.fuel.network/v1/graphql"]
  },
  "0xversion2": {
    "deployed": [
      "https://testnet.fuel.network/v1/graphql",
      "https://mainnet.fuel.network/v1/graphql"
    ]
  }
}
```

---

### Q: What to do before deploying to mainnet?

**A:** Security checklist:

- [ ] Test thoroughly on testnet
- [ ] Run: `pnpm test`
- [ ] Code review with another dev
- [ ] Verify the bytecode twice
- [ ] Start with small amount
- [ ] Use wallet with minimal funds
- [ ] Document all changes
- [ ] Backup private keys

---

## 📚 Additional Resources

- [Fuel Documentation](https://docs.fuel.network/)
- [Sway Language](https://docs.fuel.network/guides/intro-to-sway/)
- [Fuel Predicates](https://docs.fuel.network/guides/intro-to-predicates/)
- [WebAuthn Spec](https://webauthn.io/)

---

## 🤝 Need Help?

- Open an issue: [GitHub Issues](https://github.com/Bako-Labs/bako-safe/issues)
- Join the community: [Fuel Discord](https://discord.gg/fuel-labs)
- Read the source code: `/packages/sway/`

---

**Last Updated:** March 9, 2026
**Guide Version:** 1.0.0
