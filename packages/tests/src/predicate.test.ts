import { Vault, bakoCoder, SignatureType } from 'bakosafe/src/modules';
import { networks, accounts, assets } from './mocks';
import { mockAuthService, mockPredicateService } from './mocks/api';

import { Provider, Wallet } from 'fuels';
import { sendCoins } from './utils/sendCoins';
import { signin } from './utils/signin';
import { ContractAbi__factory } from './types/sway';

import contractBytecode from './types/sway/contracts/ContractAbi.hex';
import {
  WebAuthn_createCredentials,
  WebAuthn_signChallange,
} from './utils/webauthn';

jest.mock('bakosafe/src/api/auth', () => {
  return {
    TypeUser: jest.requireActual('bakosafe/src/api/auth').TypeUser,
    AuthService: jest.fn().mockImplementation(() => mockAuthService),
  };
});

jest.mock('bakosafe/src/api/predicates', () => {
  return {
    PredicateService: jest.fn().mockImplementation(() => mockPredicateService),
  };
});

describe('[INSTACE]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Create', async () => {
    const provider = await Provider.create(networks['LOCAL']);
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 2,
      SIGNERS: [
        accounts['USER_1'].address,
        accounts['USER_2'].address,
        accounts['USER_3'].address,
      ],
    });

    await sendCoins(vault.address.toString(), '0.1', assets['ETH']);

    const balance = (await vault.getBalance(assets['ETH'])).formatUnits(18);
    expect(0.0).toBeLessThan(Number(balance));
  });

  it('Create a tx with assets to destination', async () => {
    const provider = await Provider.create(networks['LOCAL']);
    const vault = new Vault(provider, {
      SIGNATURES_COUNT: 2,
      SIGNERS: [
        accounts['USER_1'].address,
        accounts['USER_2'].address,
        accounts['USER_3'].address,
      ],
    });

    await sendCoins(vault.address.toString(), '0.1', assets['ETH']);

    const { tx, hashTxId } = await vault.BakoFormatTransfer([
      {
        amount: '0.1',
        assetId: assets['ETH'],
        to: accounts['USER_1'].address,
      },
    ]);

    tx.witnesses = bakoCoder.encode([
      {
        type: SignatureType.Fuel,
        signature: await signin(hashTxId, 'USER_1'),
      },
      {
        type: SignatureType.Fuel,
        signature: await signin(hashTxId, 'USER_3'),
      },
    ]);

    const result = await vault.sendTransactionToChain(tx);

    const response = await result.waitForResult();

    expect(response).toHaveProperty('status', 'success');
  });

  it('Create a tx with tx script', async () => {
    const provider = await Provider.create(networks['LOCAL']);
    const webAuthnCredential = WebAuthn_createCredentials();

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
      SIGNERS: [
        accounts['USER_1'].address,
        accounts['USER_2'].address,
        accounts['USER_3'].address,
        webAuthnCredential.address,
      ],
    });
    await sendCoins(vault.address.toString(), '0.5', assets['ETH']);

    // Get transaction request of contract method
    const contractAbi = ContractAbi__factory.connect(deploy.contractId, vault);
    const contractMethod = contractAbi.functions.seven();
    const contractRequest = await contractMethod.fundWithRequiredCoins();

    // let transactionRequest = contractRequest;

    const { tx, hashTxId } = await vault.BakoTransfer(contractRequest);

    tx.witnesses = bakoCoder.encode([
      {
        type: SignatureType.Fuel,
        signature: await signin(hashTxId, 'USER_1'),
      },
      // {
      //   type: SignatureType.Fuel,
      //   signature: await signin(hashTxId, 'USER_3'),
      // },
      {
        type: SignatureType.WebAuthn,
        ...(await WebAuthn_signChallange(webAuthnCredential, hashTxId)),
      },
    ]);

    console.log(tx.witnesses);

    const result = await vault.sendTransactionToChain(tx);

    const response = await result.waitForResult();
    console.log(response);
    expect(response).toHaveProperty('status', 'success');

    // const script = new ScriptTransactionRequest();
    // //set this values on vault include, to add minimun required
    // script.gasLimit = bn(0);
    // script.maxFee = bn(0);

    // const coins = await vault.getResourcesToSpend([
    //   {
    //     amount: bn(100),
    //     assetId: provider.getBaseAssetId(),
    //   },
    // ]);
    // script.addResources(coins);

    // script.inputs?.forEach((input) => {
    //   if (
    //     input.type === InputType.Coin &&
    //     hexlify(input.owner) === vault.address.toB256()
    //   ) {
    //     input.predicate = arrayify(vault.bytes);
    //   }
    // });
  });

  //   it('Inválid', async () => {
  //     const VaultPayload: IPayloadVault = {
  //       configurable: {
  //         SIGNATURES_COUNT: 3,
  //         SIGNERS: [
  //           accounts['USER_1'].address,
  //           accounts['USER_2'].address,
  //           accounts['USER_3'].address,
  //         ],
  //         network: networks['DEVNET'],
  //       },
  //     };

  //     await expect(
  //       Vault.create({ ...VaultPayload, version: 'fake_version' }),
  //     ).rejects.toThrow('Invalid predicate version');

  //     //Validations
  //     const duplicated = [
  //       ...VaultPayload.configurable.SIGNERS.slice(0, 2),
  //       VaultPayload.configurable.SIGNERS[0],
  //     ];
  //     VaultPayload.configurable.SIGNERS = duplicated;
  //     await expect(Vault.create(VaultPayload)).rejects.toThrow(
  //       'SIGNERS must be unique',
  //     );

  //     VaultPayload.configurable.SIGNATURES_COUNT = 0;
  //     await expect(Vault.create(VaultPayload)).rejects.toThrow(
  //       'SIGNATURES_COUNT is required must be granter than zero',
  //     );

  //     VaultPayload.configurable.SIGNATURES_COUNT = 3;
  //     VaultPayload.configurable.SIGNERS = [];
  //     await expect(Vault.create(VaultPayload)).rejects.toThrow(
  //       'SIGNERS must be greater than zero',
  //     );

  //     VaultPayload.configurable.SIGNERS = [
  //       accounts['USER_1'].address,
  //       accounts['USER_2'].address,
  //       accounts['USER_3'].address,
  //     ];
  //     VaultPayload.configurable.SIGNATURES_COUNT = 5;
  //     await expect(Vault.create(VaultPayload)).rejects.toThrow(
  //       'Required Signers must be less than signers',
  //     );
  //   });

  //   it('Valid', async () => {
  //     const provider = await Provider.create(networks['LOCAL']);

  //     const vault = await Vault.create({
  //       configurable: {
  //         SIGNATURES_COUNT: 3,
  //         SIGNERS: [
  //           accounts['USER_1'].address,
  //           accounts['USER_2'].address,
  //           accounts['USER_3'].address,
  //         ],
  //         network: provider.url,
  //       },
  //     });

  //     await sendCoins(vault.address.toString(), '0.1', assets['ETH']);
  //     const balance = await vault.getBalance(assets['ETH']);

  //     expect(balance).toEqual(bn.parseUnits('0.1', 18));
  //     expect(vault).toHaveProperty('address');
  //   });

  //   it('Configurable missing  params', async () => {
  //     const provider = await Provider.create(networks['LOCAL']);
  //     const VaultPayload: IPayloadVault = {
  //       configurable: {
  //         network: provider.url,
  //       },
  //     };

  //     await expect(
  //       Vault.create({
  //         ...VaultPayload,
  //         configurable: {
  //           ...VaultPayload.configurable,
  //           SIGNERS: [
  //             accounts['USER_1'].address,
  //             accounts['USER_2'].address,
  //             accounts['USER_3'].address,
  //           ],
  //         },
  //       }),
  //     ).rejects.toThrow('SIGNATURES_COUNT is required');

  //     await expect(
  //       Vault.create({
  //         ...VaultPayload,
  //         configurable: {
  //           ...VaultPayload.configurable,
  //           SIGNATURES_COUNT: 3,
  //         },
  //       }),
  //     ).rejects.toThrow('SIGNERS is required');
  //   });

  //   it('Configurable with invalid params', async () => {
  //     const provider = await Provider.create(networks['LOCAL']);
  //     const VaultPayload: IPayloadVault = {
  //       configurable: {
  //         SIGNATURES_COUNT: 3,
  //         SIGNERS: [
  //           accounts['USER_1'].address,
  //           accounts['USER_2'].address,
  //           accounts['USER_3'].address,
  //         ],
  //         network: provider.url,
  //       },
  //     };

  //     VaultPayload.configurable.HASH_PREDICATE = 'hash_predicate';
  //     await expect(Vault.create(VaultPayload)).rejects.toThrow(
  //       'HASH_PREDICATE must be a b256',
  //     );

  //     delete VaultPayload.configurable.HASH_PREDICATE;
  //     VaultPayload.configurable.SIGNATURES_COUNT = undefined;
  //     await expect(Vault.create(VaultPayload)).rejects.toThrow(
  //       'SIGNATURES_COUNT must be an integer',
  //     );

  //     VaultPayload.configurable.SIGNATURES_COUNT = 0.5;
  //     await expect(Vault.create(VaultPayload)).rejects.toThrow(
  //       'SIGNATURES_COUNT must be an integer',
  //     );

  //     VaultPayload.configurable.SIGNATURES_COUNT = 3;
  //     VaultPayload.configurable.SIGNERS = undefined;
  //     await expect(Vault.create(VaultPayload)).rejects.toThrow(
  //       'SIGNERS must be an array',
  //     );

  //     VaultPayload.configurable.SIGNERS = ['signer', 'signer2', 'signer3'];
  //     await expect(Vault.create(VaultPayload)).rejects.toThrow(
  //       'SIGNERS must be an array of b256',
  //     );

  //     VaultPayload.configurable.TEST = null;
  //     await expect(Vault.create(VaultPayload)).rejects.toThrow(
  //       'TEST is an invalid parameter',
  //     );
  //   });

  //   it('Configurable valid', async () => {
  //     const provider = await Provider.create(networks['LOCAL']);
  //     const VaultPayload: IPayloadVault = {
  //       configurable: {
  //         HASH_PREDICATE: Address.fromRandom().toB256(),
  //         SIGNATURES_COUNT: 3,
  //         SIGNERS: [
  //           accounts['USER_1'].address,
  //           accounts['USER_2'].address,
  //           accounts['USER_3'].address,
  //         ],
  //         network: provider.url,
  //       },
  //     };

  //     const vault = await Vault.create(VaultPayload);
  //     expect(vault).toHaveProperty('address');
  //     expect(vault).toHaveProperty('version');
  //   });

  //   it('Auth depends without credentials', async () => {
  //     const vault = await Vault.create({
  //       configurable: {
  //         SIGNATURES_COUNT: 3,
  //         SIGNERS: [
  //           accounts['USER_1'].address,
  //           accounts['USER_2'].address,
  //           accounts['USER_3'].address,
  //         ],
  //         network: networks['LOCAL'],
  //       },
  //     });
  //     await expect(vault.BakoSafeGetTransactions()).rejects.toThrow(
  //       'Auth is required',
  //     );
  //   });
  // });

  // describe('[VERSION]', () => {
  //   beforeEach(() => {
  //     jest.clearAllMocks();
  //   });

  //   it('Intance predicate with old version', async () => {
  //     const provider = await Provider.create(networks['LOCAL']);
  //     const VaultPayload: IPayloadVault = {
  //       configurable: {
  //         SIGNATURES_COUNT: 3,
  //         SIGNERS: [
  //           accounts['USER_1'].address,
  //           accounts['USER_2'].address,
  //           accounts['USER_3'].address,
  //         ],
  //         network: provider.url,
  //       },
  //       version: predicateOldVersion,
  //     };
  //     const vault = await Vault.create(VaultPayload);

  //     expect(vault.version).not.toEqual(predicateCurrentVersion);
  //     expect(vault.version).toStrictEqual(predicateOldVersion);
  //   });

  //   it('Find current version', async () => {
  //     const current = await Vault.BakoSafeGetCurrentVersion();
  //     const _currentVersion = await currentVersion();
  //     expect(current).toHaveProperty('id');
  //     expect(current).toHaveProperty('abi');
  //     expect(current).toHaveProperty('bytes');

  //     expect(current).toStrictEqual(_currentVersion);
  //   });

  //   it('Find version by code', async () => {
  //     const version = await Vault.BakoSafeGetVersionByCode(predicateOldVersion);

  //     expect(version).toHaveProperty('id');
  //     expect(version).toHaveProperty('abi');
  //     expect(version).toHaveProperty('bytes');

  //     expect(version).toHaveProperty('code', predicateOldVersion);
  //   });

  //   it('List versions', async () => {
  //     const page = 0;
  //     const perPage = 8;
  //     const paginatedVersions = await Vault.BakoSafeGetVersions({
  //       page,
  //       perPage,
  //     });

  //     expect(paginatedVersions).toHaveProperty('data');
  //     expect(paginatedVersions).toHaveProperty('total');
  //     expect(paginatedVersions.data.length).toBeLessThanOrEqual(perPage);
  //     expect(paginatedVersions).toHaveProperty('currentPage', page);
  //     expect(paginatedVersions).toHaveProperty('perPage', perPage);
  //   });
  // });

  // describe('[DATA PERSISTENCE]', () => {
  //   it('Recover by payload without authentication', async () => {
  //     const provider = await Provider.create(networks['LOCAL']);
  //     // first instance of vault
  //     const vault = await Vault.create({
  //       configurable: {
  //         SIGNATURES_COUNT: 3,
  //         SIGNERS: [
  //           accounts['USER_1'].address,
  //           accounts['USER_2'].address,
  //           accounts['USER_3'].address,
  //         ],
  //         network: provider.url,
  //       },
  //     });

  //     // recover vault by payload
  //     const auxVault = await Vault.create({
  //       configurable: vault.getConfigurable(),
  //     });

  //     expect(auxVault.version).toStrictEqual(vault.version);
  //     expect(auxVault.getConfigurable()).toStrictEqual(vault.getConfigurable());
  //     expect(auxVault.address).toStrictEqual(vault.address);
  //     expect(await vault.getBalances()).toStrictEqual(
  //       await auxVault.getBalances(),
  //     );
  //   });

  //   it('Recover by bako id', async () => {
  //     const provider = await Provider.create(networks['LOCAL']);
  //     const vault = await Vault.create({
  //       configurable: {
  //         SIGNATURES_COUNT: 3,
  //         SIGNERS: [
  //           accounts['USER_1'].address,
  //           accounts['USER_2'].address,
  //           accounts['USER_3'].address,
  //         ],
  //         network: provider.url,
  //       },
  //       BakoSafeAuth: {
  //         address: accounts['USER_1'].address,
  //         token: 'fake_token',
  //       },
  //     });

  //     await sendCoins(vault.address.toString(), '0.1', assets['ETH']);

  //     const auxVault = await Vault.create({
  //       address: accounts['USER_1'].address,
  //       token: 'fake_token',
  //       id: vault.BakoSafeVault.id,
  //     });

  //     expect(auxVault.BakoSafeVault.id).toStrictEqual(vault.BakoSafeVault.id);
  //     expect(auxVault.version).toStrictEqual(vault.version);
  //     expect(auxVault.BakoSafeVault.version).toStrictEqual(
  //       vault.BakoSafeVault.version,
  //     );
  //     expect(auxVault.BakoSafeVault.predicateAddress).toStrictEqual(
  //       vault.BakoSafeVault.predicateAddress,
  //     );
  //     expect(await vault.getBalances()).toStrictEqual(
  //       await auxVault.getBalances(),
  //     );
  //   });

  //   it('Recover by predicate address', async () => {
  //     const provider = await Provider.create(networks['LOCAL']);
  //     const vault = await Vault.create({
  //       configurable: {
  //         SIGNATURES_COUNT: 3,
  //         SIGNERS: [
  //           accounts['USER_1'].address,
  //           accounts['USER_2'].address,
  //           accounts['USER_3'].address,
  //         ],
  //         network: provider.url,
  //       },
  //       BakoSafeAuth: {
  //         address: accounts['USER_1'].address,
  //         token: 'fake_token',
  //       },
  //     });

  //     await sendCoins(vault.address.toString(), '0.1', assets['ETH']);

  //     const auxVault = await Vault.create({
  //       address: accounts['USER_1'].address,
  //       token: 'fake_token',
  //       predicateAddress: vault.address.toString(),
  //     });

  //     expect(auxVault.BakoSafeVault.id).toStrictEqual(vault.BakoSafeVault.id);
  //     expect(auxVault.version).toStrictEqual(vault.version);
  //     expect(auxVault.BakoSafeVault.version).toStrictEqual(
  //       vault.BakoSafeVault.version,
  //     );
  //     expect(auxVault.BakoSafeVault.predicateAddress).toStrictEqual(
  //       vault.BakoSafeVault.predicateAddress,
  //     );
  //     expect(await vault.getBalances()).toStrictEqual(
  //       await auxVault.getBalances(),
  //     );
  //   });
  // });

  // describe('[TRANSACTIONS]', () => {
  //   it('List', async () => {
  //     const provider = await Provider.create(networks['LOCAL']);
  //     const perPage = 10;
  //     const page = 0;
  //     const vault = await Vault.create({
  //       configurable: {
  //         SIGNATURES_COUNT: 3,
  //         SIGNERS: [
  //           accounts['USER_1'].address,
  //           accounts['USER_2'].address,
  //           accounts['USER_3'].address,
  //         ],
  //         network: provider.url,
  //       },
  //       BakoSafeAuth: {
  //         address: accounts['USER_1'].address,
  //         token: 'fake_token',
  //       },
  //     });

  //     const transactions = await vault.BakoSafeGetTransactions();

  //     expect(transactions).toHaveProperty('data');
  //     expect(transactions).toHaveProperty('total');
  //     expect(transactions.data.length).toBeLessThanOrEqual(perPage);
  //     expect(transactions).toHaveProperty('currentPage', page);
  //     expect(transactions).toHaveProperty('perPage', perPage);
  //   });
});
