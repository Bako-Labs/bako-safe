import {
  arrayify,
  ContractFactory,
  Provider,
  ReceiptType,
  Wallet,
} from 'fuels';

import { signin, sendCoins } from './utils';
import { ContractAbi__factory } from './types/sway';
import { networks, accounts, assets } from './mocks';
import contractBytecode from './types/sway/contracts/ContractAbi.hex';
import { Vault, bakoCoder, SignatureType } from 'bakosafe/src/modules';

describe('[Create]', () => {
  let provider: Provider;
  beforeEach(async () => {
    provider = await Provider.create(networks['LOCAL']);
  });

  it('Vault', async () => {
    // create a vault
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 2,
      SIGNERS: [
        accounts['USER_1'].address,
        accounts['USER_2'].address,
        accounts['USER_3'].address,
      ],
    });
    await sendCoins(vault.address.toString(), '0.1', assets['ETH']);

    // get balance
    const balance = (await vault.getBalance(assets['ETH'])).formatUnits(18);
    expect(0.0).toBeLessThan(Number(balance));
  });

  it('Simple transaction', async () => {
    // create a vault
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [accounts['USER_1'].address],
    });
    await sendCoins(vault.address.toString(), '0.1', assets['ETH']);

    // create a transaction
    const { tx, hashTxId } = await vault.BakoFormatTransfer([
      {
        amount: '0.1',
        assetId: assets['ETH'],
        to: accounts['USER_1'].address,
      },
    ]);

    // sign
    tx.witnesses = bakoCoder.encode([
      {
        type: SignatureType.Fuel,
        signature: await signin(hashTxId, 'USER_1'),
      },
    ]);

    // send
    const result = await vault.sendTransactionToChain(tx);
    const response = await result.waitForResult();
    expect(response).toHaveProperty('status', 'success');
  });

  it('Transaction by ScriptTransactionRequest', async () => {
    // deploy a contract to call
    const wallet = Wallet.fromPrivateKey(accounts['FULL'].privateKey, provider);
    const deploy = await ContractAbi__factory.deployContract(
      contractBytecode,
      wallet,
    );
    await deploy.waitForResult();

    // create a vault
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [accounts['USER_1'].address],
    });
    await sendCoins(vault.address.toString(), '0.5', assets['ETH']);

    // Get transaction request of contract method
    const contractAbi = ContractAbi__factory.connect(deploy.contractId, vault);
    const contractMethod = contractAbi.functions.seven();
    const contractRequest = await contractMethod.fundWithRequiredCoins();
    const { tx, hashTxId } = await vault.BakoTransfer(contractRequest);

    tx.witnesses = bakoCoder.encode([
      {
        type: SignatureType.Fuel,
        signature: await signin(hashTxId, 'USER_1'),
      },
    ]);

    const result = await vault.sendTransactionToChain(tx);
    const response = await result.waitForResult();

    expect(response).toHaveProperty('status', 'success');
    expect(response.receipts).toContainEqual(
      expect.objectContaining({
        type: ReceiptType.ReturnData,
        data: '0x0000000000000007',
      }),
    );
  });

  it('Transaction by CreateTransactionRequest', async () => {
    // create a vault
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [accounts['USER_1'].address],
    });
    await sendCoins(vault.address.toString(), '0.5', assets['ETH']);

    const { contractId, transactionRequest } = new ContractFactory(
      arrayify(contractBytecode),
      ContractAbi__factory.abi,
      vault,
    ).createTransactionRequest();

    const { tx, hashTxId } = await vault.BakoTransfer(transactionRequest);

    const signatures = bakoCoder.encode([
      {
        type: SignatureType.Fuel,
        signature: await signin(hashTxId, 'USER_1'),
      },
    ]);
    // keep the first signature position
    // because the first signature is the contract creation bytecode
    tx.witnesses?.push(...signatures);

    // send
    const result = await vault.sendTransactionToChain(tx);
    const response = await result.waitForResult();

    // call this contract
    const wallet = Wallet.fromPrivateKey(accounts['FULL'].privateKey, provider);
    const contractAbi = ContractAbi__factory.connect(contractId, wallet);
    const contractMethod = contractAbi.functions.seven();
    const contractRequest = await contractMethod.fundWithRequiredCoins();

    const callResult = await wallet.sendTransaction(contractRequest);
    const callResponse = await callResult.waitForResult();

    // expect
    expect(response).toHaveProperty('status', 'success');
    expect(callResponse).toHaveProperty('status', 'success');
    expect(callResponse.receipts).toContainEqual(
      expect.objectContaining({
        type: ReceiptType.ReturnData,
        data: '0x0000000000000007',
      }),
    );
  });
});
