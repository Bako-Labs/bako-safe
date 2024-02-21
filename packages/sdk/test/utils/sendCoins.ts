import { BN, WalletUnlocked, bn } from 'fuels';

import { assets } from '../mocks';
import { Vault } from '../../src/vault/Vault';

const { GAS_PRICE, GAS_LIMIT } = process.env;

export const txParams = {
  gasPrice: bn(GAS_PRICE),
  gasLimit: bn(GAS_LIMIT),
};

export const sendPredicateCoins = async (
  predicate: Vault,
  amount: BN,
  asset: 'ETH' | 'DAI' | 'sETH',
  rootWallet: WalletUnlocked,
) => {
  const deposit = await rootWallet.transfer(
    predicate.address,
    amount,
    assets[asset],
    txParams,
  );
  await deposit.wait();
};
