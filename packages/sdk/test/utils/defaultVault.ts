import { Provider, bn } from 'fuels';
import { IPayloadVault, Vault } from '../../src/modules';
import { rootWallet } from './rootWallet';
import { sendPredicateCoins } from './sendCoins';
import { IBakoSafeAuth } from '../../src/api';
import { DEFAULT_BALANCE_VALUE, VALUES_DEFAULT_TO_MUL } from '../mocks/assets';
import { BakoSafe } from '../../configurables';

export const newVault = async (
  signers: string[],
  fuelProvider: Provider,
  auth?: IBakoSafeAuth,
  reason?: keyof typeof VALUES_DEFAULT_TO_MUL,
) => {
  const VaultPayload: IPayloadVault = {
    configurable: {
      SIGNATURES_COUNT: 3,
      SIGNERS: signers,
      network: fuelProvider.url,
    },
    BakoSafeAuth: auth,
  };
  const vault = await Vault.create(VaultPayload);
  const new_balance = DEFAULT_BALANCE_VALUE.mul(
    VALUES_DEFAULT_TO_MUL[reason ?? 1],
  );

  await sendPredicateCoins(vault!, new_balance, 'sETH', rootWallet);
  await sendPredicateCoins(vault!, new_balance, 'ETH', rootWallet);
  return vault;
};
