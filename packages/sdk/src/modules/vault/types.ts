import { ITransferAsset } from '../../utils';
import { ICreateTransactionPayload } from '../service';

export type VaultConfigurable = {
  SIGNATURES_COUNT: number;
  SIGNERS: string[];
  HASH_PREDICATE?: string;
};

export type VaultTransaction = Pick<ICreateTransactionPayload, 'name'> & {
  assets: ITransferAsset[];
};
