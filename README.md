# BSAFE 🐢

### Fuel Shared Wallet

A streamlined solution within the Fuel ecosystem, enabling seamless implementation and effortless coin transfers in a collaborative wallet environment.

## Links

- [Bsafe](https://www.bsafe.pro)
- [BSAFE beta version](https://app.bsafe.pro)
- [Fuel Wallet](https://chrome.google.com/webstore/detail/fuel-wallet/dldjpboieedgcmpkchcjcbijingjcgok)
- [Simple app exemple](https://github.com/infinitybase/bsafe-example)
- [Implementation details](https://github.com/infinitybase/bsafe/blob/d56523ab905d4749fa22787936db41a100be08c9/src/__tests__/vault.test.ts)

### Resources

- Create shared wallets 💰
- Set up sending requirements 🔧
- Validate signatures 🔏
- Send different assets to different destinations in the same transaction 📤
- Data persistence for transactions with the BSAFE API 📝

## Install

```
yarn add bsafe
```

```
npm install bsafe
```

## Requirements

- [Rust](https://www.rust-lang.org/tools/install)
- [Fuel toochain](https://github.com/FuelLabs/fuelup)

## The guist

There are currently two ways to use this package, the first of which is with the data persistence of the API built BSAFE and used in the dApp[BSAFE](https://app.bsafe.pro) and there is another without
the data persistence, only to generate and validate transactions.

For this guide, we will be using some [scripts](https://github.com/infinitybase/bsafe/src/utils) and a node [fuelVM](https://github.com/FuelLabs/fuel-vm) running locally, in addition there are a file
[defaultConfigurable](https://github.com/infinitybase/bsafe/src/configurables.ts) for the main parameters and a folder with [mocks](https://github.com/infinitybase/bsafe/src/mocks) for fake coins and
accounts.

In a simple way, we can implement use without data persistence

```typescript
import { BN, Provider, Wallet, bn } from 'fuels';
import {Vault, IPayloadVault, IPayloadTransfer, sign, defaultConfigurable, mocks, accounts} from 'bsafe'

// instance a new fuel provider to http://localhost:4000/graphql
const fuelProvider = new Provider(defaultConfigurable.provider);

// import default accounts to vmnode runner on http://localhost:4000/graphql
const signers = [accounts['USER_1'].address, accounts['USER_2'].address, accounts['USER_3'].address];

// make your vault
const VaultPayload: IPayloadVault = {
    configurable: {
        SIGNATURES_COUNT: 3, // required signatures
        SIGNERS: signers, // witnesses account
        network: fuelProvider.url // your network connected wallet
        chainId: await fuelProvider.getChainId()
    },
    provider: fuelProvider,
};

const vault = await Vault.create(VaultPayload);


// Include transaction coins
const transfer: IPayloadTransfer[] = [
    {
        amount: bn(1_000).format(),
        assetId: assets['ETH'],
        to: accounts['STORE'].address
    }
];

// Create a transaction
const tx = await vault.BSAFEIncludeTransaction(transfer);

// Insert your transaction hash signed by witnesses
tx.BSAFEScript.witnesses = [
    await signin(tx.getHashTxId(), 'USER_1'),
    await signin(tx.getHashTxId(), 'USER_2'),
    await signin(tx.getHashTxId(), 'USER_3')
]

// Signin transaction
const result = await tx.send().then(async (tx) => await tx.wait());
```

On implementation with data persistence through bsafe-api, do you need instance vault with IAUTHBsafe.

```typescript
import { AuthService, IBSAFEAuth } from 'bsafe';

const auth = new AuthService();
await auth.createUser(accounts['STORE'].address, defaultConfigurable.provider);
await auth.createSession();

const VaultPayload: IPayloadVault = {
    configurable: {
        SIGNATURES_COUNT: 3, // required signatures
        SIGNERS: signers, // witnesses account
        network: fuelProvider.url // your network connected wallet
        chainId: await fuelProvider.getChainId()
    },
    provider: fuelProvider,
    BSAFEAuth: auth.BSAFEAuth
};
const vault = new Vault(VaultPayload);
//Here you can retrieve the information about your predicate, passing only the BSAFEId (id within the bsafe api) or the address of this predicate

const auxVault = Vault.instanceBSAFEVault(vault.address.toString())
const _auxVault = Vault.instanceBSAFEVault(vault.BSAFEVaultId)

//from any of the instances we will be able to generate a transaction
const transf: IPayloadTransfer = {
    assets: [
        {
            amount: bn(1_000_000_000_000_000).format(),
            assetId: assets['ETH'],
            to: accounts['STORE'].address
        },
        {
            amount: bn(1_000_000_000_000_000).format(),
            assetId: assets['sETH'],
            to: accounts['STORE'].address
        }
    ],
    BSAFEAuth: auth.BSAFEAuth
};

//You can also instantiate a transaction at any time, passing the bsafe api id to it
//transaction and _transaction is equal transfer instances
const transaction = await vault.BSAFEIncludeTransaction(transf)
const _transaction = await vault.BSAFEIncludeTransaction(transaction.BSAFETransactionId)


await transaction.send()
const result = await transaction.wait()

```
