import { bn, Predicate, Provider } from 'fuels';
import { join } from 'path';
import { readFileSync } from 'fs';
import { BakoContractDeploy, BakoSafe } from 'bakosafe';
import { ContractAbi__factory } from '../../types/sway';

export const createTransactionDeploy = async (
  provider: Provider,
  vault: Predicate<any>
) => {
  const byteCodePath = join(
    __dirname,
    `../../sway/src/contract/out/debug/contract.bin`
  );

  const byteCode = readFileSync(byteCodePath);

  const deploy_class = new BakoContractDeploy(
    byteCode,
    ContractAbi__factory.abi,
    provider,
    vault.address.toB256()
  );

  const { transactionRequest, contractId } = await deploy_class.deploy();

  const coins = await vault.getResourcesToSpend([
    {
      amount: bn(1000000),
      assetId: provider.getBaseAssetId()
    }
  ]);
  transactionRequest.addResources(coins);
  transactionRequest.maxFee = bn(BakoSafe.getGasConfig('MAX_FEE'));

  return {
    transactionRequest,
    contractId
  };
};