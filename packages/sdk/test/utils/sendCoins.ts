import { BN, WalletUnlocked, bn } from 'fuels';
import { BSafe } from '../../configurables';
import { assets } from '../mocks';
import { Vault } from '../../src/modules/vault/Vault';

export const txParams = {
  gasPrice: bn(BSafe.getChainConfig('GAS_PRICE')),
  gasLimit: bn(BSafe.getChainConfig('GAS_LIMIT')),
};

export const sendPredicateCoins = async (
  predicate: Vault,
  amount: BN,
  asset: 'ETH' | 'DAI' | 'sETH',
  rootWallet: WalletUnlocked,
) => {
  const deposit = await rootWallet.transfer(
    predicate.address.toString(),
    amount,
    assets[asset],
    txParams,
  );

  return await deposit.waitForResult();
};
