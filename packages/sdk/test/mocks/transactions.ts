import type { Provider } from 'fuels';
import { v4 as uuidv4 } from 'uuid';
import type { IFormatTransfer } from '../../src/modules';
import {
  DEFAULT_BALANCES,
  DEFAULT_MULTI_ASSET_BALANCES,
  assets,
} from './assets';

export const DEFAULT_TRANSACTION_PAYLOAD = (
  address: string,
  provider?: Provider,
): IFormatTransfer => {
  return {
    name: `tx_${uuidv4()}`,
    assets: DEFAULT_BALANCES.map((balance) => ({
      assetId: provider ? provider.getBaseAssetId() : assets.ETH,
      amount: balance.amount.format(),
      to: address,
    })),
  };
};

export const DEFAULT_MULTI_ASSET_TRANSACTION_PAYLOAD = (
  address: string,
  assetIds?: string[],
): IFormatTransfer => {
  return {
    name: `tx_${uuidv4()}`,
    assets: DEFAULT_MULTI_ASSET_BALANCES.filter(
      (balance) => !assetIds || assetIds.includes(balance.assetId),
    ).map((balance) => ({
      assetId: balance.assetId,
      amount: balance.amount.format(),
      to: address,
    })),
  };
};
