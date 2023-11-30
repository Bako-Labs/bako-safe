import { bn } from 'fuels';

export const defaultConfigurable = {
  encoder: 'fuel',
  api_url: 'http://localhost:3333',
  //api_url: 'https://stg-api.bsafe.pro',
  provider: 'http://localhost:4000/graphql',
  //provider: 'https://beta-4.fuel.network/graphql',
  gasPrice: bn(100),
  gasLimit: bn(100000),
  refetchTimeout: 1000,
};
