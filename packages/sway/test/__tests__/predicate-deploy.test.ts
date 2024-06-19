import {
  bn,
  hexlify,
  Wallet,
  Provider,
} from 'fuels';
import { callContractMethod, createTransactionDeploy } from 'bakosafe-test-utils';

import { accounts } from '../../../sdk/test/mocks';
import { signin } from '../../../sdk/test/utils/signin';
import {
  sendTransaction,
  CHAIN_URL,
  createPredicate,
  GATEWAY_URL,
} from '../utils';
import { authService } from '../../../sdk/test/utils';
import { BakoSafe, Vault } from '../../../sdk';

describe('[SWAY_PREDICATE] Send transfers', () => {
  let providers: { fuel: Provider, gateway: Provider };

  BakoSafe.setProviders({
    CHAIN_URL,
    SERVER_URL: 'http://localhost:3333'
  });

  beforeAll(async () => {
    providers = {
      fuel: await Provider.create(CHAIN_URL),
      gateway: await Provider.create(GATEWAY_URL)
    };
  });

  // Create an tx with type create (1) and send to the chain to deploy a new contract
  //https://github.com/FuelLabs/fuels-ts/blob/018efe96bde4fec5d49964fc55a725ecf9f7632e/packages/account/src/providers/transaction-request/hash-transaction.ts
  test('To deploy new contract on chain', async () => {
    const { fuel: fuelProvider } = providers;
    const predicate = await createPredicate({
      amount: '0.1',
      minSigners: 1,
      signers: [accounts['USER_1'].account]
    });

    const { transactionRequest, contractId } = await createTransactionDeploy(
      fuelProvider,
      predicate
    );

    const id = transactionRequest.getTransactionId(fuelProvider.getChainId()).slice(2);

    transactionRequest.witnesses.push(await signin(id, 'USER_1', undefined));

    const result = await sendTransaction(fuelProvider, transactionRequest, [
      ...transactionRequest.witnesses, // we have an bytecode of contract, dont move this position
      await signin(id, 'USER_1', undefined)
    ]);

    const res = await result.waitForResult();
    expect(res.status).toBe('success');

    //verify if the contract was deployed
    const wallet = Wallet.fromPrivateKey(accounts['FULL'].privateKey, fuelProvider);
    const { value } = await callContractMethod({
      method: 'zero',
      contractId,
      account: wallet
    });

    expect(Number(value)).toBe(0);
  });

  test('Deploy transaction in gateway', async () => {
    const { fuel: fuelProvider, gateway: gatewayProvider } = providers;
    const { USER_1: user, FULL: genesisAccount } = await authService(['USER_1', 'FULL'], fuelProvider.url);

    // Create a new vault
    const vault = await Vault.create({
      configurable: {
        SIGNATURES_COUNT: 1,
        SIGNERS: [genesisAccount.address],
        network: fuelProvider.url
      },
      BakoSafeAuth: genesisAccount.BakoSafeAuth
    });

    // Send coins to the vault
    const wallet = Wallet.fromPrivateKey(genesisAccount.privateKey, fuelProvider);
    await wallet.transfer(vault.address, bn.parseUnits('0.1'));

    // Create the transaction request
    let { transactionRequest, contractId } = await createTransactionDeploy(
      gatewayProvider,
      vault
    );

    // Submit to the gateway
    await gatewayProvider.connect(`${gatewayProvider.url}?api_token=${JSON.stringify(user.BakoSafeAuth)}&vault_id=${vault.BakoSafeVaultId}`);
    const { submit: { id } } = await gatewayProvider.operations.submit({ encodedTransaction: hexlify(transactionRequest.toTransactionBytes()) });

    // Sign the transaction
    const signature = await wallet.signMessage(id.slice(2));
    transactionRequest.witnesses.push(signature);

    // Estimate and submit
    transactionRequest = await fuelProvider.estimatePredicates(transactionRequest);
    await fuelProvider.operations.submit({ encodedTransaction: hexlify(transactionRequest.toTransactionBytes()) });

    // Execute deployed contract
    const { value } = await callContractMethod({
      method: 'zero',
      contractId,
      account: wallet,
    });

    expect(Number(value)).toBe(0);
  });
});
