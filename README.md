# BSAFE 🐢

### Fuel Shared Wallet

A streamlined solution within the Fuel ecosystem, enabling seamless implementation and effortless coin transfers in a collaborative wallet environment.

## Links

-   [Bsafe](https://bsafe.com)
-   [BSAFE beta version](https://app.bsafe.com)
-   [Fuel Wallet](https://chrome.google.com/webstore/detail/fuel-wallet/dldjpboieedgcmpkchcjcbijingjcgok)
-   [Simple app exemple](https://github.com/infinitybase/bsafe-example)
-   [Implementation details](https://github.com/infinitybase/bsafe/blob/d56523ab905d4749fa22787936db41a100be08c9/src/__tests__/vault.test.ts)

### Resources

-   Create shared wallets 💰
-   Set up sending requirements 🔧
-   Validate signatures 🔏
-   Send different assets to different destinations in the same transaction 📤

## Install

```
yarn add bsafe
```

```
npm install bsafe
```

## The guist

```javascript
import {Vault, IPayloadVault, ITransferAsset} from 'bsafe'
import accounts from '../mocks/accounts.json';
import assets from '../mocks/assets.json';

const fuelProvider = new Provider('http://beta-3.fuel.network/graphql');
const txParams = {
    gasPrice: bn(1)
};
const rootWallet = Wallet.fromPrivateKey(accounts['FULL'].privateKey, fuelProvider);

const signers = [accounts['USER_1'].address, accounts['USER_2'].address, accounts['USER_3'].address];

// make your vault
const VaultPayload: IPayloadVault = {
    configurable: {
        HASH_PREDUCATE: undefined, //undefined to new Vault or an valid hash to instance older vault
        SIGNATURES_COUNT: 1, // required signatures
        SIGNERS: signers, // witnesses account
        network: fuelProvider.url // your network connected wallet
    }
};
const vault = new Vault(VaultPayload);

const _assets: ITransferAsset[] = [
    {
        amount: bn(1_000).format(),
        assetId: assets['ETH'],
        to: accounts['STORE'].address
    }
];

// Create a transaction
const transaction = await vault.includeTransaction(_assets, []);

// Signin transaction
const signer = Wallet.fromPrivateKey(accounts[account].privateKey, fuelProvider); // instance an wallet account
const tx_hash = transaction.getHashTxId() //get transaction hash
const witnesses = [
    signer.signMessage()
];
//set transaction witnesses
transaction.witnesses = witnesses;

//send transaction
const result = await transaction.sendTransaction()

```
