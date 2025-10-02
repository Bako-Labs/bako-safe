import { ITransferAsset } from './assets';
import { ICreateTransactionPayload } from '../provider/services';

export type VaultTransaction = Pick<ICreateTransactionPayload, 'name'> & {
  assets: ITransferAsset[];
};

export enum ConfigVaultType {
  BAKO = 0,
  CONNECTOR = 1,
}

export type BakoConfigurableType = {
  SIGNATURES_COUNT: number;
  SIGNERS: string[];
  HASH_PREDICATE?: string;
};

export interface ConnectorConfigurableType {
  SIGNER: string;
}

// Novos tipos com enum type
export type BakoConfig = {
  type: ConfigVaultType.BAKO;
} & BakoConfigurableType;

export type ConnectorConfig = {
  type: ConfigVaultType.CONNECTOR;
} & ConnectorConfigurableType;

export type ConfigurableVault = {
  type: ConfigVaultType;
  data: BakoConfigurableType | ConnectorConfigurableType;
};

export type VaultConfigurable =
  | BakoConfigurableType
  | ConnectorConfigurableType;

// Union type para os novos tipos com enum
export type VaultConfig = BakoConfig | ConnectorConfig;
