import { Provider } from 'fuels';
import { randomUUID } from 'crypto';
import { accounts } from '../mocks/accounts';

export const setupBaseTransaction = (provider: Provider) => {
  return {
    name: randomUUID(),
    assets: [
      {
        assetId: provider.getBaseAssetId(),
        to: accounts['STORE'].address,
        amount: '0.5',
      },
    ],
  };
};
