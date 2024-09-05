import { Wallet, Provider } from 'fuels';

import { accounts, networks } from '../mocks';

export const signin = async (
  tx_hash: string,
  account: 'FULL' | 'USER_1' | 'USER_2' | 'USER_3' | 'USER_4' | 'USER_5',
) => {
  const fuelProvider = await Provider.create(networks['LOCAL']);

  const signer = Wallet.fromPrivateKey(
    accounts[account].privateKey,
    fuelProvider,
  );
  const tx = await signer.signMessage(tx_hash);

  return tx;
};
