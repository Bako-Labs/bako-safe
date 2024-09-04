import { BN, Provider, Wallet, bn } from 'fuels';
import { BakoSafe } from 'bakosafe';

import { accounts, networks } from '../mocks';

export const txParams = {
  maxFee: bn(BakoSafe.getGasConfig('MAX_FEE')),
  gasLimit: bn(BakoSafe.getGasConfig('GAS_LIMIT')),
};

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

  const deposit = await rootWallet.transfer(address, _amount, asset, txParams);

  return await deposit.waitForResult();
};
