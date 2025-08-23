import { ITransferAsset } from '../../utils';
import { ICreateTransactionPayload } from '../service';

export type VaultTransaction = Pick<ICreateTransactionPayload, 'name'> & {
  assets: ITransferAsset[];
};

export enum ConfigVaultType {
  BAKO = 1,
  CONNECTOR = 2,
}

export type BakoConfigurableType = {
  SIGNATURES_COUNT: number;
  SIGNERS: string[];
  HASH_PREDICATE?: string;
};

export type ConfigurableVault = {
  type: ConfigVaultType;
  data: BakoConfigurableType | ConnectorConfigurableType;
};

export interface ConnectorConfigurableType {
  SIGNER: string;
}

export type VaultConfigurable =
  | BakoConfigurableType
  | ConnectorConfigurableType;
