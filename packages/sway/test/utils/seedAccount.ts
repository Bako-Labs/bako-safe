import { AbstractAddress, BN, Provider, Wallet } from 'fuels';
import { PRIVATE_KEY, GAS_LIMIT } from './constants';

export async function seedAccount(
  address: AbstractAddress,
  amount: BN,
  provider: Provider,
) {
  try {
    const genisesWallet = Wallet.fromPrivateKey(PRIVATE_KEY, provider);

    const resp = await genisesWallet.transfer(
      address,
      amount,
      provider.getBaseAssetId(),
      {
        gasLimit: Number(GAS_LIMIT),
      },
    );
    await resp.waitForResult();
  } catch (e) {
    throw new Error(e.response.errors[0].message ?? 'Seed Account Error');
  }
}
