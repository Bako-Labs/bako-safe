import { Provider } from 'fuels';
import { IFormatTransfer } from '../../src/modules';
import { assets, DEFAULT_BALANCES } from './assets';
import { v4 as uuidv4 } from 'uuid';

export const DEFAULT_TRANSACTION_PAYLOAD = (
  address: string,
  provider?: Provider,
): IFormatTransfer => {
  return {
    name: `tx_${uuidv4()}`,
    assets: DEFAULT_BALANCES.map((balance) => ({
      assetId: !!provider ? provider.getBaseAssetId() : assets['ETH'],
      amount: balance.amount.format(),
      to: address,
    })),
  };
};
