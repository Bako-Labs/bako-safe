export const defaultConfig = {
  PROVIDER: 'http://localhost:4000/graphql',
  API_URL: 'http://localhost:3333/',
  BSAFE_URL: 'https://app.bsafe.pro/',
  ENCODER: 'Fuel',
  GAS_PRICE: 1,
  GAS_LIMIT: 10000,
  REFETCH_TIMEOUT: 1000,
};

const unEditable = ['ENCODER', 'BSAFE_URL'];

export type DefaultConfigurables = typeof defaultConfig;
export type DefaultConfigurablesKeys = keyof DefaultConfigurables;

export const BSafe = {
  setup: (params: Partial<DefaultConfigurables>) => {
    const configurableKeys = Object.keys(params);

    configurableKeys.forEach((key) => {
      if (key in defaultConfig && !unEditable.includes(key)) {
        // @ts-ignore
        defaultConfig[key] = params[key]!;
      }
    });
  },
  get: (key: DefaultConfigurablesKeys) => defaultConfig[key],
};
