import { Provider, bn } from 'fuels';
import { IPayloadVault, Vault } from '../../src/vault';
import { rootWallet } from './rootWallet';
import { sendPredicateCoins } from './sendCoins';
import { IBSAFEAuth } from '../../src/api';
import { DEFAULT_BALANCE_VALUE, VALUES_DEFAULT_TO_MUL } from '../mocks/assets';

export const newVault = async (
  signers: string[],
  fuelProvider: Provider,
  auth?: IBSAFEAuth,
  reason?: keyof typeof VALUES_DEFAULT_TO_MUL,
) => {
  const VaultPayload: IPayloadVault = {
    configurable: {
      SIGNATURES_COUNT: 3,
      SIGNERS: signers,
      network: fuelProvider.url,
      chainId: fuelProvider.getChainId(),
    },
    provider: fuelProvider,
    BSAFEAuth: auth,
  };
  const vault = await Vault.create(VaultPayload);
  const new_balance = DEFAULT_BALANCE_VALUE.mul(
    VALUES_DEFAULT_TO_MUL[reason ?? 1],
  );

  await sendPredicateCoins(vault!, new_balance, 'sETH', rootWallet);
  await sendPredicateCoins(vault!, new_balance, 'ETH', rootWallet);
  return vault;
};
