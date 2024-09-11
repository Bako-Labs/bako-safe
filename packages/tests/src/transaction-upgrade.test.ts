import {
  BytesLike,
  hexlify,
  Predicate,
  Provider,
  UpgradeTransactionRequest,
  Wallet,
  WalletUnlocked,
} from 'fuels';
import { accounts, assets, PRIVILEGED_CONSENSUS_BYTECODE } from './mocks';
import { randomBytes } from 'crypto';
import { launchTestNode } from 'fuels/test-utils';
import { bakoCoder, SignatureType, Vault } from '../../sdk/src';
import { signin } from './utils';
import { expect } from '@jest/globals';

const baseAssetId = assets['ETH'];

const setupTestNode = async (predicate: Vault) => {
  const wallet = Wallet.fromPrivateKey(accounts['USER_1'].privateKey);
  const predicateAddress = predicate.address.toB256();
  const consensusParameters = {
    V1: {
      privileged_address: wallet.address.toB256(),
      base_asset_id: baseAssetId,
    },
  };
  const coin = {
    owner: wallet.address.toB256(),
    amount: 1000000000,
    asset_id: baseAssetId,
    tx_id: hexlify(randomBytes(32)),
    output_index: 0,
    tx_pointer_block_height: 0,
    tx_pointer_tx_idx: 0,
  };
  const snapshotConfig = {
    chainConfig: { consensus_parameters: consensusParameters },
    stateConfig: { coins: [coin] },
  };

  const { provider, wallets, cleanup } = await launchTestNode({
    nodeOptions: {
      args: ['--poa-instant', 'false', '--poa-interval-period', '1ms'],
      loggingEnabled: false,
      snapshotConfig,
    },
    walletsConfig: {
      count: 1,
    },
  });
  // @ts-ignore
  predicate.provider = provider;
  wallet.provider = provider;

  return {
    provider,
    predicate,
    wallets,
    wallet,
    cleanup,
    [Symbol.dispose]: cleanup,
  };
};

const upgradeConsensusParameters = async (
  vault: Vault,
  bytecode: BytesLike,
) => {
  const request = new UpgradeTransactionRequest();
  request.addConsensusParametersUpgradePurpose(bytecode);

  const { tx, hashTxId } = await vault.BakoTransfer(request);
  const signature = await signin(hashTxId, 'USER_1', vault.provider);
  const witness = bakoCoder.encode({
    type: SignatureType.Fuel,
    signature,
  });
  tx.witnesses.push(witness);

  const response = await vault.send(tx);
  return response.waitForResult();
};

describe('[Transaction Upgrade]', () => {
  let node: Awaited<ReturnType<typeof launchTestNode>>;

  beforeEach(async () => {
    node = await launchTestNode();
  });

  afterEach(() => {
    node.cleanup();
  });

  it('should correctly upgrade privileged address of chain', async () => {
    // @ts-ignore
    const vault = new Vault(node.provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [accounts['USER_1'].address],
    });
    //
    using asdasd = await setupTestNode(vault);
    const { wallet } = asdasd;
    //
    //   const { isTypeUpgrade, isStatusSuccess, ...rest } =
    //     await upgradeConsensusParameters(vault, PRIVILEGED_CONSENSUS_BYTECODE);
    //   expect(isTypeUpgrade).toBeTruthy();
    //   expect(isStatusSuccess).toBeTruthy();
    //
    //   await expect(() =>
    //     upgradeConsensusParameters(vault, PRIVILEGED_CONSENSUS_BYTECODE),
    //   ).rejects.toThrowError(/Validity\(TransactionUpgradeNoPrivilegedAddress\)/);
    const upgradeConsensusParameters = async (
      wallet: WalletUnlocked,
      bytecode: BytesLike,
    ) => {
      const request = new UpgradeTransactionRequest();
      request.addConsensusParametersUpgradePurpose(bytecode);

      const cost = await wallet.getTransactionCost(request);
      request.maxFee = cost.maxFee;
      await wallet.fund(request, cost);

      const response = await wallet.sendTransaction(request);
      return response.waitForResult();
    };

    const { isStatusSuccess, isTypeUpgrade } = await upgradeConsensusParameters(
      wallet,
      PRIVILEGED_CONSENSUS_BYTECODE,
    );
    expect(isStatusSuccess).toBeTruthy();
    expect(isTypeUpgrade).toBeTruthy();

    await expect(() =>
      upgradeConsensusParameters(wallet, PRIVILEGED_CONSENSUS_BYTECODE),
    ).rejects.toThrowError(/Validity\(TransactionUpgradeNoPrivilegedAddress\)/);
  });
});
