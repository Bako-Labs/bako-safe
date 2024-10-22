import fs from 'fs';

import { FuelToolChain } from '../../sdk/src/sway/predicates/types';

export async function getFuelToolchain(
  filePath: string,
): Promise<FuelToolChain> {
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  const versionInfoRegex =
    /Fuels version:\s*([\d.]+)[\s\S]*?Forc version:\s*([\d.]+)[\s\S]*?Fuel-Core version:\s*([\d.]+)/;

  const match = fileContent.match(versionInfoRegex);

  if (match) {
    return {
      fuelsVersion: match[1],
      forcVersion: match[2],
      fuelCoreVersion: match[3],
    };
  }

  throw new Error('Could not find version information');
}
