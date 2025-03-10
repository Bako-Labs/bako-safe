# Contracts and scripts
On Bako Safe, to authenticate and execute transactions for our protocol, we provide the `BakoProvider` where it is possible to instantiate the `Vault` using an `API Token`.
By connecting the provider, all transactions are sent to our protocol, allowing direct management through our `APP`.

The `Vault` is a Predicate. When sending a transaction by calling the method `sendTransaction(transactionRequestLike: TransactionRequestLike)`, 
the transaction will be sent to our protocol. Every contract and script call executes the `sendTransaction`, so it is possible to make calls to contracts and scripts by passing 
the `Vault` as a parameter. Example:

**Script**
```ts
const provider = await BakoProvider.create('<PROVIDER_URL>', { 
  apiToken: '<API_TOKEN>', 
});
const vault = new Vault(provider);
const script = new ScriptExample(vault);
const { waitForResult, transactionId } = await script.functions.main().call();
```

**Contract**
```ts
const provider = await BakoProvider.create('<PROVIDER_URL>', {
  apiToken: '<API_TOKEN>',
});
const vault = new Vault(provider);
const contract = new ContractExample(vault);
const {waitForResult, transactionId} = await contract.functions.test_function().call();
```

## Prerequisites
- Create an account and Vault on [Bako Safe](https://safe.bako.global/)
- Open the settings and click in the `API Token` button
- Set the `API Token` in the [index.ts](./src/index.ts) file
  ```ts
  const config = {
    apiToken: '<API_TOKEN>',
    provider: 'https://testnet.fuel.network/v1/graphql',
    contractId: '0x869297f1dd9121cdc4773d58a63233ce715a839642b9c6d930c3dcef6b312791',
  };
  ```
  
## Run
- Install dependencies
  ```bash
  pnpm install
  ```
- Run the example
  ```bash
  pnpm start
  ```