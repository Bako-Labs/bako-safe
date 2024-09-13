import { Wallet, Provider } from 'fuels';

import { accounts, networks } from '../mocks';

export const signin = async (
  tx_hash: string,
  account: 'FULL' | 'USER_1' | 'USER_2' | 'USER_3' | 'USER_4' | 'USER_5',
  provider: string,
) => {
  const fuelProvider = await Provider.create(provider);

  const signer = Wallet.fromPrivateKey(
    accounts[account].privateKey,
    fuelProvider,
  );
  const tx = await signer.signMessage(tx_hash);

  return tx;
};
