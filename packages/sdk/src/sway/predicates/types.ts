import { JsonAbi } from 'fuels';
import { Wallet } from 'src/utils/vault/configurable';

export interface FuelToolChain {
  fuelsVersion: string;
  forcVersion: string;
  fuelCoreVersion: string;
}

export interface Version {
  bytecode: string;
  abi: JsonAbi;
  time: number;
  toolchain: FuelToolChain;
  deployed: string[];
  walletOrigin: string;
  // manually put in versions.json hourly
  description?: string;
  // used to indentify the wallet origin
}

export interface VersionFile {
  [version: string]: Version;
}
