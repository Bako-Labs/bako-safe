import { bn } from 'fuels';

type DefaultConfigurables = Partial<
  Pick<typeof defaultConfigurable, 'api_url' | 'bsafe_url' | 'provider'>
>;

export const defaultConfigurable = {
  // api_url: 'http://localhost:3333',
  // bsafe_url: 'http://localhost:5174',
  // provider: 'http://localhost:4000/graphql',
  // stg
  //api_url: 'https://stg-api.bsafe.pro',
  //bsafe_url: 'https://bsafe-ui-git-staging-infinity-base.vercel.app/',
  provider: 'https://beta-4.fuel.network/graphql',
  //prd
  api_url: 'https://api-multsig.infinitybase.com/',
  bsafe_url: 'https://app.bsafe.pro/',
  encoder: 'fuel',
  gasPrice: bn(100),
  gasLimit: bn(100000),
  chainId: 0,
  refetchTimeout: 1000,
};

export const BSafe = {
  setup: (params: DefaultConfigurables) => {
    const configurableKeys = Object.keys(
      params,
    ) as unknown as (keyof DefaultConfigurables)[];

    configurableKeys.forEach((key) => {
      if (key in defaultConfigurable) {
        defaultConfigurable[key] = params[key]!;
      }
    });
  },
};
