import {
  hexlify,
  BytesLike,
  WalletUnlocked,
  UpgradeTransactionRequest,
  UploadTransactionRequest,
  Provider,
} from 'fuels';
import {
  assets,
  PRIVILEGED_CONSENSUS_BYTECODE,
  GAS_COSTS_CONSENSUS_BYTECODE,
} from './mocks';
import { randomBytes } from 'crypto';
import { launchTestNode } from 'fuels/test-utils';
import { bakoCoder, SignatureType, Vault } from 'bakosafe';
import { subsectionFromBytecode } from './utils';
import { beforeAll } from '@jest/globals';

const baseAssetId = assets['ETH'];

class FakeProvider extends Provider {
  // eslint-disable-next-line @typescript-eslint/require-await
  static async create(url: string) {
    return new FakeProvider(url, {});
  }

  getChainId(): number {
    return 1;
  }
}

const setupTestNode = async (signers: WalletUnlocked[]) => {
  const fakeProvider = await FakeProvider.create('http://example.com');
  const vault = new Vault(fakeProvider, {
    SIGNATURES_COUNT: 1,
    SIGNERS: signers.map((signer) => signer.address.toB256()),
  });
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
  signers.forEach((signer) => (signer.provider = provider));

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
  signer: WalletUnlocked,
) => {
  const request = new UpgradeTransactionRequest();
  request.addConsensusParametersUpgradePurpose(bytecode);

  const { tx, hashTxId } = await vault.BakoTransfer(request);
  const signature = await signer.signMessage(hashTxId);
  const witness = bakoCoder.encode({
    type: SignatureType.Fuel,
    signature,
  });
  tx.witnesses.push(witness);

  const response = await vault.send(tx);
  return response.waitForResult();
};

describe('[Transaction Upgrade]', () => {
  let signers: WalletUnlocked[];

  beforeAll(async () => {
    signers = [WalletUnlocked.generate(), WalletUnlocked.generate()];
  });

  it('should correctly upgrade privileged address of chain', async () => {
    using node = await setupTestNode(signers);

    const { vault } = node;
    const [signer] = signers;

    // Upgrade privileged address to a new address
    const { isStatusSuccess, isTypeUpgrade } = await upgradeConsensusParameters(
      vault,
      PRIVILEGED_CONSENSUS_BYTECODE,
      signer,
    );
    expect(isStatusSuccess).toBeTruthy();
    expect(isTypeUpgrade).toBeTruthy();

    await vault.provider.fetchChainAndNodeInfo();

    // Check if the privileged address has been updated
    await expect(() =>
      upgradeConsensusParameters(vault, PRIVILEGED_CONSENSUS_BYTECODE, signer),
    ).rejects.toThrowError(/Validity\(TransactionUpgradeNoPrivilegedAddress\)/);
  });

  it('should correctly upgrade gas costs of chain', async () => {
    using node = await setupTestNode(signers);

    const { vault, provider } = node;
    const [signer] = signers;

    const {
      consensusParameters: { gasCosts: gasCostsBefore },
    } = provider.getChain();

    // Upgrade gas costs of chain to free
    const { isStatusSuccess, isTypeUpgrade } = await upgradeConsensusParameters(
      vault,
      GAS_COSTS_CONSENSUS_BYTECODE,
      signer,
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

describe('[Transaction Upload]', () => {
  let node: Awaited<ReturnType<typeof setupTestNode>>;
  let signers: WalletUnlocked[];
  let bytecodeSubsections: ReturnType<typeof subsectionFromBytecode>;

  beforeAll(async () => {
    const initialNode = await launchTestNode();
    signers = [WalletUnlocked.generate(), WalletUnlocked.generate()];
    node = await setupTestNode(signers);
    bytecodeSubsections = subsectionFromBytecode();
    initialNode.cleanup();
  });

  afterAll(() => {
    node.cleanup();
  });

  it('should correctly upload the bytecode slowly', async () => {
    const {
      wallets: [wallet],
    } = node;
    const { subsections } = bytecodeSubsections;
    const requests = subsections.map((subsection) => {
      const request = UploadTransactionRequest.from({});
      request.addSubsection({
        proofSet: subsection.proofSet,
        subsection: subsection.subsection,
        root: subsection.root,
        subsectionsNumber: subsection.subsectionsNumber,
        subsectionIndex: subsection.subsectionIndex,
      });
      return request;
    });

    // Upload the subsections
    for (const request of requests) {
      const cost = await wallet.getTransactionCost(request);
      request.maxFee = cost.maxFee;
      await wallet.fund(request, cost);
      request.maxFee = cost.maxFee.add(1);
      const response = await wallet.sendTransaction(request);
      const { isTypeUpload, isStatusSuccess } = await response.waitForResult();
      expect(isTypeUpload).toBeTruthy();
      expect(isStatusSuccess).toBeTruthy();
    }
  });

  it('should correctly upgrade chain with uploaded bytecode', async () => {
    const { vault, provider } = node;
    const [signer] = signers;

    const { merkleRoot } = bytecodeSubsections;

    // Upgrade the chain with the root
    const request = new UpgradeTransactionRequest();
    request.addStateTransitionUpgradePurpose(merkleRoot);

    const { tx, hashTxId } = await vault.BakoTransfer(request);
    const signature = await signer.signMessage(hashTxId);
    const witness = bakoCoder.encode({
      type: SignatureType.Fuel,
      signature,
    });
    tx.witnesses.push(witness);

    const response = await vault.send(tx);
    const { isTypeUpgrade, isStatusSuccess, blockId } =
      await response.waitForResult();
    expect(isTypeUpgrade).toBeTruthy();
    expect(isStatusSuccess).toBeTruthy();

    // Check the bytecode version has changed
    const block = await provider.getBlock(blockId as string);
    await provider.produceBlocks(1);
    const nextBlock = await provider.getBlock('latest');

    const versionBeforeUpgrade = block?.header.stateTransitionBytecodeVersion;
    const versionAfterUpgrade =
      nextBlock?.header.stateTransitionBytecodeVersion;

    expect(versionBeforeUpgrade).not.toEqual(versionAfterUpgrade);
  });
});
