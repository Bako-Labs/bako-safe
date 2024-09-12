import { BytesLike, hexlify, UpgradeTransactionRequest, Provider } from 'fuels';
import {
  accounts,
  assets,
  PRIVILEGED_CONSENSUS_BYTECODE,
  GAS_COSTS_CONSENSUS_BYTECODE,
} from './mocks';
import { randomBytes } from 'crypto';
import { launchTestNode } from 'fuels/test-utils';
import { bakoCoder, SignatureType, Vault } from '../../sdk/src';
import { signin } from './utils';
import { expect } from '@jest/globals';

const baseAssetId = assets['ETH'];

const setupTestNode = async (vault: Vault) => {
  const predicateAddress = vault.address.toB256();
  const consensusParameters = {
    V1: {
      privileged_address: predicateAddress,
      base_asset_id: baseAssetId,
    },
  };
  const coin = {
    owner: predicateAddress,
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
  vault.provider = provider;

  return {
    vault,
    wallets,
    cleanup,
    provider,
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
  let vault: Vault;

  beforeEach(async () => {
    node = await launchTestNode();
    vault = new Vault(node.provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [accounts['USER_1'].address],
    });
  });

  afterEach(() => {
    node.cleanup();
  });

  it('should correctly upgrade privileged address of chain', async () => {
    using node = await setupTestNode(vault);
    const { vault: privilegedVault } = node;

    // Upgrade privileged address to a new address
    const { isStatusSuccess, isTypeUpgrade } = await upgradeConsensusParameters(
      privilegedVault,
      PRIVILEGED_CONSENSUS_BYTECODE,
    );
    expect(isStatusSuccess).toBeTruthy();
    expect(isTypeUpgrade).toBeTruthy();

    await privilegedVault.provider.fetchChainAndNodeInfo();

    // Check if the privileged address has been updated
    await expect(() =>
      upgradeConsensusParameters(
        privilegedVault,
        PRIVILEGED_CONSENSUS_BYTECODE,
      ),
    ).rejects.toThrowError(/Validity\(TransactionUpgradeNoPrivilegedAddress\)/);
  });

  it('should correctly upgrade gas costs of chain', async () => {
    using node = await setupTestNode(vault);
    const { vault: privilegedVault, provider } = node;

    const {
      consensusParameters: { gasCosts: gasCostsBefore },
    } = provider.getChain();

    // Upgrade gas costs of chain to free
    const { isStatusSuccess, isTypeUpgrade } = await upgradeConsensusParameters(
      privilegedVault,
      GAS_COSTS_CONSENSUS_BYTECODE,
    );
    expect(isStatusSuccess).toBeTruthy();
    expect(isTypeUpgrade).toBeTruthy();

    const {
      consensusParameters: { gasCosts: gasCostsAfter },
    } = await provider.fetchChain();

    // Check if gas costs have been updated
    expect(gasCostsAfter).not.toEqual(gasCostsBefore);
  });
});
