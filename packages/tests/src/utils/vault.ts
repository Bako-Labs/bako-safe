import { Vault } from 'bakosafe/src';
import { sendCoins } from './sendCoins';
import { Provider } from 'fuels';

export const setupVault = async (
  signers: string[],
  provider: Provider,
  requiredSig?: number,
) => {
  const vault = await Vault.create({
    configurable: {
      SIGNERS: signers,
      SIGNATURES_COUNT: requiredSig ?? signers.length,
      network: provider.url,
    },
  });

  await sendCoins(vault.address.toB256(), '0.6', provider.getBaseAssetId());

  return vault;
};
