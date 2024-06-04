import { join } from 'path';
import { readFileSync } from 'fs';

import { BakoContractDeploy } from '../../../sdk/src/modules';
import { ContractAbi__factory } from '../../../sdk/src/sway/contracts';
import { bn, Predicate, Provider } from 'fuels';
import { MAX_FEE } from './constants';

export const createTransactionDeploy = async (
  provider: Provider,
  predicate: Predicate<[]>,
) => {
  const byteCodePath = join(
    __dirname,
    `../../src/contract/out/debug/contract.bin`,
  );

  const byteCode = readFileSync(byteCodePath);

  const deploy_class = new BakoContractDeploy(
    byteCode,
    ContractAbi__factory.abi,
    provider,
    predicate.address.toB256(),
  );

  const { transactionRequest: tx, contractId } = await deploy_class.deploy();

  const coins = await predicate.getResourcesToSpend([
    {
      amount: bn(100),
      assetId: provider.getBaseAssetId(),
    },
  ]);
  tx.addResources(coins);

  tx.maxFee = bn(MAX_FEE);

  return {
    tx,
    contractId,
  };
};
