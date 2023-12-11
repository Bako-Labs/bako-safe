import { bn } from 'fuels';

export const defaultConfigurable = {
  //bsafe_url: 'http://app.bsafe.pro', // prd
  // api_url: 'http://localhost:3333',
  // bsafe_url: 'http://localhost:5174',
  // provider: 'http://localhost:4000/graphql',
  api_url: 'https://stg-api.bsafe.pro',
  bsafe_url: 'https://bsafe-ui-git-staging-infinity-base.vercel.app/', // stg
  provider: 'https://beta-4.fuel.network/graphql',
  encoder: 'fuel',
  gasPrice: bn(100),
  gasLimit: bn(100000),
  chainId: 0,
  refetchTimeout: 1000,
};
