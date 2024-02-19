import { BN, WalletUnlocked, bn } from 'fuels';

import { assets } from '../mocks';
import { Vault } from '../../src/predicates/Vault';

const { GAS_PRICE } = process.env;

export const txParams = {
  gasPrice: bn(GAS_PRICE),
};

export const sendPredicateCoins = async (
  predicate: Vault,
  amount: BN,
  asset: 'ETH' | 'DAI' | 'sETH',
  rootWallet: WalletUnlocked,
) => {
  console.log(predicate);
  const deposit = await rootWallet.transfer(
    predicate.address,
    amount,
    assets[asset],
    txParams,
  );
  await deposit.wait();
};
