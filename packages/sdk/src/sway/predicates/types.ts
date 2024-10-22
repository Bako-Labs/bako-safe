import { JsonAbi } from 'fuels';

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
  description?: string; // manually put in versions.json hourly
}

export interface VersionFile {
  [version: string]: Version;
}
