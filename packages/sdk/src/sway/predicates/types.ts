import { JsonAbi } from 'fuels';

export interface Version {
  bytecode: string;
  abi: JsonAbi;
  time: number;
}

export interface VersionFile {
  [version: string]: Version;
}
