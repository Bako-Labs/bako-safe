import { Wallet, Address, BigNumberCoder, concat } from 'fuels';
import { IBakoSafeAuth, TransactionService } from 'bakosafe';

import { accounts } from '../mocks';
import { LocalProvider } from './provider';

export const signin = async (
  tx_hash: string,
  account: 'FULL' | 'USER_1' | 'USER_2' | 'USER_3' | 'USER_4' | 'USER_5',
) => {
  const fuelProvider = new LocalProvider();

  const signer = Wallet.fromPrivateKey(
    accounts[account].privateKey,
    fuelProvider,
  );
  const tx = await signer.signMessage(tx_hash);

  return tx;
};
