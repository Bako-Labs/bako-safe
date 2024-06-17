import { ContractAbi__factory } from '../../types/sway';
import { Account, Provider } from 'fuels';

export const getContractInstance = async (contractId: string, accountOrProvider: Account | Provider) => ContractAbi__factory.connect(contractId, accountOrProvider);