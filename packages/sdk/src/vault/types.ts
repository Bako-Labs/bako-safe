import { Provider, TransactionRequestLike } from 'fuels';
import { IBSAFEAuth } from '../api/auth/types';
import {
  IListTransactions,
  IPredicate,
  IPredicateService,
} from '../api/predicates';
import { ITransferAsset } from '../assets';
import { IFormatTransfer, Transfer } from '../transfers';
import { ITransactionResume, IWitnesses } from '../api';

export interface IConfVault {
  HASH_PREDICATE?: number[];
  SIGNATURES_COUNT: number;
  SIGNERS: string[];
  network: string;
  chainId: number;
}

export enum ECreationtype {
  IS_OLD = 'IS_OLD',
  IS_NEW = 'IS_NEW',
  ERROR = 'ERROR',
}

export interface ICreationOld {
  type: ECreationtype.IS_NEW;
  payload: IPayloadVault;
}

export interface ICreationNew {
  type: ECreationtype.IS_OLD;
  payload: IPayloadVault;
}

export interface ICreationError {
  type: ECreationtype.ERROR;
  payload: string;
}

export type ICreation = ICreationOld | ICreationNew | ICreationError;

export interface ITransferList {
  [id: string]: Transfer;
}

export interface IInstanceNewTransfer {
  assets: ITransferAsset[];
  witnesses: string[];
}

export type IBSAFEIncludeTransaction = IFormatTransfer | TransactionRequestLike;

export interface IPayloadVault {
  configurable: IConfVault;
  provider: Provider;
  name?: string;
  description?: string;
  transactionRecursiveTimeout?: number;
  abi?: string;
  bytecode?: string;
  BSAFEAuth?: IBSAFEAuth;
  BSAFEVaultId?: string;
  BSAFEVault?: IPredicate;
  api?: IPredicateService;
}
export interface IBSAFEApi extends IBSAFEAuth {
  id?: string;
  predicateAddress?: string;
}
export interface IBSAFEGetTransactions {
  resume: ITransactionResume;
  witnesses: IWitnesses[];
}
export interface IVault {
  getAbi: () => { [name: string]: unknown };
  getBin: () => string;
  getConfigurable: () => IConfVault;
  BSAFEGetTransactions: (
    params?: IListTransactions,
  ) => Promise<IBSAFEGetTransactions[]>;
  BSAFEIncludeTransaction: (
    params: IBSAFEIncludeTransaction,
  ) => Promise<Transfer>;
}
