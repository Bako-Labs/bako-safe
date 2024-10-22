import { JsonAbi } from 'fuels';

export interface Version {
  bytecode: string;
  abi: JsonAbi;
  time: number;
}

export interface FuelToolChain {
  fuelsVersion: string;
  forcVersion: string;
  fuelCoreVersion: string;
}

export interface VersionFile {
  [version: string]: Version;
}
