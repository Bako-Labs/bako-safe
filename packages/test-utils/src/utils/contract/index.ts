import { TestContract, TestContractFactory } from "../../types/sway";
import { Account } from "fuels";

export type ContractInstanceParams = { contractId: string; account: Account };

export type ContractParams = ContractInstanceParams & {
  method: keyof TestContract["functions"];
};

export const getContractInstance = async (params: ContractInstanceParams) =>
  new TestContract(params.contractId, params.account);

export const callContractMethod = async (params: ContractParams) => {
  const contract = await getContractInstance(params);
  return (await contract.functions[params.method]().call()).waitForResult();
};

export const getContractCallTransaction = async (params: ContractParams) => {
  const contract = await getContractInstance(params);
  return contract.functions[params.method]().getTransactionRequest();
};
