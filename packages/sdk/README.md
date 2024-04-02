# 📦 Bako Safe SDK

## Links

- [Bako-safe](https://safe.bako.global/)
- [Fuel Wallet](https://chrome.google.com/webstore/detail/fuel-wallet/dldjpboieedgcmpkchcjcbijingjcgok)
- [FuelVM local node](https://github.com/infinitybase/bako-safe/tree/master/docker/chain)

### Resources

- Create shared wallets 💰
- Set up sending requirements 🔧
- Validate signatures 🔏
- Send different assets to different destinations in the same transaction 📤
- Data persistence for transactions with the BAKO SAFE API 📝

## Install

```
yarn add bako-safe
```

```
npm install bako-safe
```

## Requirements

- [Rust](https://www.rust-lang.org/tools/install)
- [Fuel toochain](https://github.com/FuelLabs/fuelup)

## The guist

You can find more information about this time in the [official documentation](https://doc-safe.bako.global/)

There are currently two ways to use this package, the first of which is with the data persistence of the API built Bako Safe and used in the dApp [Bako Safe](https://safe.bako.global/) and there is another without
the data persistence, only to generate and validate transactions.

In a simple way, we can implement use without data persistence

```typescript
import { BN, Provider, Wallet, bn, Address } from 'fuels';
import {
    Vault,
    IPayloadVault,
    IPayloadTransfer,
    sign,
    defaultConfigurable,
    mocks,
    accounts,
    IFormatTransfer,
    NativeAssetId
} from 'bako-safe'

// if you run a local node of FuelVm use http://localhost:4000/graphql
const fuelProvider = new Provider('https://beta-5.fuel.network/graphql');

//
const signers = [Address.fromRandom().toString(), Address.fromRandom().toString()];

// make your vault
const VaultPayload: IPayloadVault = {
    configurable: {
        SIGNATURES_COUNT: 1, // required signatures
        SIGNERS: signers, // witnesses account
        network: fuelProvider.url // your network connected wallet
        chainId: await fuelProvider.getChainId() // get chain id or try 0 to fuel node
    },
    provider: fuelProvider,
};

const vault = await Vault.create(VaultPayload);

// This data is an array with all outputs, we send to 2 diferent accounts
const transfer: IFormatTransfer[] =
    {
        name: `tx_example`
        assets: [
            {
                amount: bn(1_000).format(), // value to send on string formatt
                assetId: NativeAssetId, // to send ETH coins
                to: Address.fromRandom().toString() // destination of coins
            },
            {
                amount: bn(1_000).format(), // value to send on string formatt
                assetId: NativeAssetId, // to send ETH coins
                to: Address.fromRandom().toString() // destination of coins
            }
        ]
    }


// Create a transaction
const tx = await vault.BSAFEIncludeTransaction(transfer);

// use the fuel wallet to collect signatures
tx.witnesses = [
    //your signatures
]

// Send transaction
tx.send()
const result = await tx.wait();
```

If you need use the version with data persistence, check this [tests](https://github.com/infinitybase/bako-safe/tree/master/packages/sdk/test/__tests__) to verify implementation.
