import { Provider } from 'fuels';
import { IFormatTransfer } from '../../src/modules';
import { DEFAULT_BALANCES } from './assets';
import { v4 as uuidv4 } from 'uuid';

export const DEFAULT_TRANSACTION_PAYLOAD = (
  address: string,
): IFormatTransfer => {
  return {
    name: `tx_${uuidv4()}`,
    assets: DEFAULT_BALANCES.map((balance) => ({
      assetId: balance.assetId,
      amount: balance.amount.format(),
      to: address,
    })),
  };
};
