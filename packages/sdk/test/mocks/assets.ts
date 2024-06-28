import { bn } from 'fuels';

export const assets = {
  ETH: '0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07', // local node has configured with this baseAssetId
  BTC: '0xfe3f96763e20e5d168037065a3bc65b751df7a038fd9297cc1cb5c740fd1c170',
  USDC: '0xda1fb840452bba3ab65a11f782902e7286fc44b94a9b85059dd7f8b68bf371d4',
  UNI: '0xb3238af388ac05188e342b1801db79d358e4a162734511316c937b00c8687fe9',
};

export const VALUES_DEFAULT_TO_MUL = {
  min: 0.0001,
  1: 1,
  2: 2,
  3: 3,
  5: 5,
  10: 10,
  100: 100,
  1000: 1000,
  10000: 10000,
  5000000: 5000000,
};

export const DEFAULT_BALANCE_VALUE = bn.parseUnits(
  VALUES_DEFAULT_TO_MUL.min.toString(),
);

export const DEFAULT_BALANCES = [
  { assetId: assets['ETH'], amount: DEFAULT_BALANCE_VALUE },
];

export const DEFAULT_MULTI_ASSET_BALANCES = [
  { assetId: assets['ETH'], amount: DEFAULT_BALANCE_VALUE },
  { assetId: assets['BTC'], amount: DEFAULT_BALANCE_VALUE },
  { assetId: assets['USDC'], amount: DEFAULT_BALANCE_VALUE },
  { assetId: assets['UNI'], amount: DEFAULT_BALANCE_VALUE },
];
