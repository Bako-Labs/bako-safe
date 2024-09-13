import { BN, Provider, Wallet, bn } from 'fuels';

import { accounts, networks } from '../mocks';

export const sendCoins = async (
  address: string,
  amount: string,
  asset: string,
) => {
  const _amount = bn.parseUnits(amount);
  const rootWallet = Wallet.fromPrivateKey(
    accounts['FULL'].privateKey,
    await Provider.create(networks['LOCAL']),
  );

  const deposit = await rootWallet.transfer(address, _amount, asset);

  return await deposit.waitForResult();
};
