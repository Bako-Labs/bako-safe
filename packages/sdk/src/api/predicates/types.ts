import { Workspace } from '../auth';
import { GetTransactionParams, ITransaction } from '../transactions';
import { IPagination } from '../utils/pagination';
import { Operation, TransactionRequest } from 'fuels';

export enum SortOption {
  asc = 'ASC',
  desc = 'DESC',
}

export interface IPredicatePayload {
  name: string;
  description?: string;
  predicateAddress: string;
  minSigners: number;
  addresses: string[];
  configurable: string;
  provider: string;
  chainId?: number;
  versionCode?: string;
}

export interface IPredicateMember {
  id: string;
  avatar: string;
  address: string;
}

export interface IPredicate extends Omit<IPredicatePayload, 'addresses'> {
  id: string;
  members: IPredicateMember[];
  owner: IPredicateMember;
  version: IPredicateVersion;
  workspace: Workspace;
  createdAt: string;
  updatedAt: string;
}

export interface GetPredicateVersionParams {
  q?: string;
  code?: string;
  active?: boolean;
  perPage?: number;
  page?: number;
  orderBy?: string;
  sort?: SortOption;
}

export interface IListTransactions
  extends GetTransactionParams,
    Omit<GetTransactionParams, 'predicateId'> {}

export interface IPredicateVersion {
  id: string;
  abi: string;
  bytes: string;
  code: string;
}

export interface IDeposit {
  date: Date;
  id: string;
  operations: Operation[];
  gasUsed: string;
  txData: TransactionRequest;
}

export interface IExtendedPredicate {
  predicate: IPredicate;
  missingDeposits: IDeposit[];
}

export interface IPredicateService {
  create: (payload: IPredicatePayload) => Promise<IPredicate>;
  findByAddress: (predicateAddress: string) => Promise<IPredicate>;
  findById: (predicateAddress: string) => Promise<IPredicate>;
  hasReservedCoins: (predicateAddress: string) => Promise<string[]>;
  listPredicateTransactions: (
    params: GetTransactionParams,
  ) => Promise<IPagination<ITransaction>>;

  //Version
  findVersionByCode: (code: string) => Promise<IPredicateVersion>;
  findCurrentVersion: () => Promise<IPredicateVersion>;
  listVersions: (
    params: GetPredicateVersionParams,
  ) => Promise<IPagination<IPredicateVersion>>;
}
