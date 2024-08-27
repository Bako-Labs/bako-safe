import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type BN,
  type BytesLike,
  ContractFactory,
  type DeployContractOptions,
  type JsonAbi,
  type Predicate,
  type Provider,
  bn,
} from "fuels";
import { TestContract } from "../../types/sway";

export class BakoContractDeploy extends ContractFactory {
  readonly abi: JsonAbi;
  readonly predicate: string;

  constructor(
    bytecode: BytesLike,
    abi: JsonAbi,
    provider: Provider,
    predicate: string,
  ) {
    super(bytecode, abi, provider);
    this.predicate = predicate;
    this.abi = abi;
  }

  async getDeployRequest(deployContractOptions: DeployContractOptions = {}) {
    if (!this.predicate) {
      throw new Error("Predicate not set");
    }

    const { configurableConstants } = deployContractOptions;

    if (configurableConstants) {
      this.setConfigurableConstants(configurableConstants);
    }

    const { contractId, transactionRequest } = this.createTransactionRequest(
      deployContractOptions,
    );

    return {
      contractId,
      transactionRequest,
    };
  }
}

export const createTransactionDeploy = async (
  provider: Provider,
  // biome-ignore lint/suspicious/noExplicitAny: in this case, we need it to be any
  vault: Predicate<any>,
  _maxFee?: BN | number,
) => {
  const byteCodePath = join(
    __dirname,
    "../../sway/contract/out/debug/contract.bin",
  );

  const byteCode = readFileSync(byteCodePath);

  const deploy_class = new BakoContractDeploy(
    byteCode,
    // @ts-ignore
    TestContract.abi,
    provider,
    vault.address.toB256(),
  );

  const { transactionRequest, contractId } =
    await deploy_class.getDeployRequest();

  const coins = await vault.getResourcesToSpend([
    {
      amount: bn(1),
      assetId: provider.getBaseAssetId(),
    },
  ]);
  transactionRequest.addResources(coins);

  return {
    transactionRequest,
    contractId,
  };
};
