import { BakoProvider, Vault } from "bakosafe";
import { ContractExample, ScriptExample } from './artifacts';

const config = {
  apiToken: '',
  provider: 'https://testnet.fuel.network/v1/graphql',
  contractId: '0x869297f1dd9121cdc4773d58a63233ce715a839642b9c6d930c3dcef6b312791',
};

const contractCall = async (vault: Vault) => {
  const contract = new ContractExample(config.contractId, vault);

  console.log(`Calling 'test_function' on contract ${config.contractId}`);
  const {waitForResult, transactionId} = await contract.functions.test_function().call();

  console.log(`Transaction ID: ${transactionId}`);
  console.log(`Waiting for the transaction to be approved on Bako...`);
  await waitForResult();

  console.log(`Transaction executed!`);
}

const scriptCall = async (vault: Vault) => {
  const script = new ScriptExample(vault);

  console.log(`Calling 'main' on script`);
  const { waitForResult, transactionId } = await script.functions.main().call();

  console.log(`Transaction ID: ${transactionId}`);
  console.log(`Waiting for the transaction to be approved on Bako...`);
  await waitForResult();

  console.log(`Transaction executed!`);
}

async function main() {
  // Initialize the BakoProvider authenticating with an API Token
  const provider = await BakoProvider.create(
    config.provider,
    { apiToken: config.apiToken },
  );

  // Initialize the Vault with the provider
  const vault = new Vault(provider);
  console.log(`Vault initialized!`, {
    address: vault.address.toString(),
    balance: (await vault.getBalance()).formatUnits()
  });

  // Call the contract
  await contractCall(vault);

  // Call the script
  await scriptCall(vault);
}

main();