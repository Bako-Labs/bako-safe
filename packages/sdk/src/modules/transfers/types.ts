import {
  ScriptTransactionRequest,
  TransactionRequest,
  TransactionRequestLike,
  TransactionStatus,
} from 'fuels';
import { ITransferAsset } from '../../utils/assets/types';
import {
  ITransaction,
  ITransactionResume,
  ITransactionService,
  IWitnesses,
} from '../../api/transactions';
import { Vault } from '../vault';
import { IBSAFEAuth } from '../../api';

export interface TransferConstructor {
  name: string;
  service?: ITransactionService;
  witnesses: string[];
  transactionRequest: TransactionRequest;
  BSAFEScript: ScriptTransactionRequest;
  BSAFETransaction?: ITransaction;
  BSAFETransactionId?: string;
  vault: Vault;
}

export enum ECreationTransactiontype {
  IS_OLD = 'IS_OLD',
  IS_NEW = 'IS_NEW',
  IS_SCRIPT = 'IS_SCRIPT',
}

export interface ICreationOldTransfer {
  type: ECreationTransactiontype.IS_NEW;
  payload: TransferConstructor;
}

export interface ICreationNewTransfer {
  type: ECreationTransactiontype.IS_OLD;
  payload: TransferConstructor;
}

export interface ICreationScriptTransfer {
  type: ECreationTransactiontype.IS_SCRIPT;
  payload: TransferConstructor;
}

export type ICreationTransaction =
  | ICreationOldTransfer
  | ICreationNewTransfer
  | ICreationScriptTransfer;

export type TransferFactoryParam =
  | string // id e txhash
  | IFormatTransfer // payload
  | TransactionRequestLike // request like formatado da fuel
  | ITransaction;

export interface TransferFactory {
  auth?: IBSAFEAuth;
  transfer: TransferFactoryParam;
  vault: Vault;
  isSave?: boolean;
}

export interface IPayloadTransfer {
  assets: ITransferAsset[];
  witnesses?: string[];
  name?: string;
}

export interface IFormatTransfer {
  name: string;
  assets: ITransferAsset[];
  witnesses?: string[];
}

export interface IInstanceTransfer {
  txData: TransactionRequest;
  hash: string;
}

export interface IRequiredWitnesses {
  required: number;
  signed: number;
  witnesses: IWitnesses[];
}

export interface ITransferResult {
  status: TransactionStatus;
  block?: string;
  witnesses?: string[];
  outputs?: ITransferAsset[];
  bsafeID?: string;
  fee?: string;
  gasUsed?: string;
}

export interface ISendTransaction {
  status: string;
  block: string;
  gasUsed: string;
}

export enum TransferInstanceError {
  REQUIRED_AUTH = 'Required credentials',
  INVALID_PARAMETER = 'Invalid instance parameters',
}

export interface ITransfer {
  send(): void;
  getScript(): TransactionRequest;
  wait(): Promise<ITransactionResume | undefined>;
  getAssets(): ITransferAsset[];
}
