import { Address, Wallet } from 'fuels';
import { type IBakoSafeAuth, TransactionService } from '../../src/api';

import { accounts } from '../mocks';
import { LocalProvider } from './provider';

export const signin = async (
  tx_hash: string,
  account: 'FULL' | 'USER_1' | 'USER_2' | 'USER_3' | 'USER_4' | 'USER_5',
  auth?: IBakoSafeAuth,
  BakoSafeTransactionId?: string,
) => {
  const fuelProvider = new LocalProvider();

  const signer = Wallet.fromPrivateKey(
    accounts[account].privateKey,
    fuelProvider,
  );
  const tx = await signer.signMessage(tx_hash);
  if (!!auth && BakoSafeTransactionId) {
    const acc = Address.fromString(accounts[account].address).toB256();
    const serviceTransactions = new TransactionService(auth);
    return await serviceTransactions.sign(BakoSafeTransactionId, acc, tx);
  }
  return tx;
};
