import { bn, hexlify, Provider, transactionRequestify, Wallet } from 'fuels';
import { authService, IUserAuth, newVault, signin } from '../utils';
import { BakoSafe } from '../../configurables';
import { accounts } from '../mocks';
import { DeployTransfer, TransactionService, TransactionStatus } from '../../src';
import { callContractMethod, createTransactionDeploy } from 'bakosafe-test-utils';

describe('[TRANSFERS] Deploy', () => {
  let auth: IUserAuth;
  let provider: Provider;
  let signers: string[];

  // Set providers
  BakoSafe.setProviders({
    CHAIN_URL: 'http://localhost:4000/v1/graphql',
    SERVER_URL: 'http://localhost:3333',
    CLIENT_URL: 'http://localhost:5174'
  });

  beforeAll(async () => {
    provider = await Provider.create(BakoSafe.getProviders('CHAIN_URL'));
    auth = await authService(
      ['USER_1', 'USER_2', 'USER_3', 'USER_5', 'USER_4'],
      provider.url
    );

    signers = [
      accounts['USER_1'].address,
      accounts['USER_2'].address
    ];
  }, 30 * 1000);

  test('Create a transaction request for deploy', async () => {
    const vault = await newVault(
      signers,
      provider,
      auth['USER_1'].BakoSafeAuth,
      100
    );

    const { transactionRequest } = await createTransactionDeploy(provider, vault);
    const createTransactionRequest = await DeployTransfer.createTransactionRequest({
      ...transactionRequest.toTransaction(),
      vault
    });

    const txHex = hexlify(transactionRequest.toTransactionBytes());
    const txDeployHex = hexlify(createTransactionRequest.toTransactionBytes());

    expect(txHex).toEqual(txDeployHex);
  });

  test(
    'Create a DeployTransfer instance from transaction create',
    async () => {
      const vault = await newVault(
        signers,
        provider,
        auth['USER_1'].BakoSafeAuth,
        100
      );

      const { transactionRequest } = await createTransactionDeploy(provider, vault);
      const deployTransfer = await DeployTransfer.fromTransactionCreate({
        ...transactionRequest.toTransaction(),
        vault,
        name: 'Contract deploy'
      });

      const txIdFromDeployTransfer = deployTransfer.getHashTxId();
      const txIdFromTransactionDeploy = transactionRequest.getTransactionId(vault.provider.getChainId()).slice(2);

      expect(txIdFromDeployTransfer).toEqual(txIdFromTransactionDeploy);
    },
    100 * 1000
  );

  test(
    'Submit a DeployTransfer and try execute contract',
    async () => {
      const { USER_1: user } = auth;
      const { FULL: genesis } = accounts;

      const vault = await newVault(
        signers,
        provider,
        user.BakoSafeAuth,
        10000,
        1
      );
      const { transactionRequest, contractId } = await createTransactionDeploy(provider, vault);

      const deployTransfer = await DeployTransfer.fromTransactionCreate({
        ...transactionRequest.toTransaction(),
        vault,
        name: '',
        auth: user.BakoSafeAuth
      });

      await signin(
        deployTransfer.getHashTxId(),
        'USER_1',
        user.BakoSafeAuth,
        deployTransfer.BakoSafeTransactionId
      );

      await deployTransfer.wait();
      expect(contractId).toBe(deployTransfer.getContractId());

      const { value } = await callContractMethod({
        method: 'zero',
        contractId: deployTransfer.getContractId(),
        account: Wallet.fromPrivateKey(genesis.privateKey, provider)
      });

      expect(Number(value)).toBe(0);
    },
    100 * 1000
  );
});
