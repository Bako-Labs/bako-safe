export const defaultConfig = {
  PROVIDER: 'http://localhost:4000/graphql',
  API_URL: 'http://localhost:3333/',
  BSAFE_URL: 'https://safe.bako.global',
  ENCODER: 'Fuel',
};

export const gasConfig = {
  GAS_PRICE: 1,
  GAS_LIMIT: 10000,
};

const unEditable = ['ENCODER'];

export type DefaultConfigurables = typeof defaultConfig;
export type DefaultConfigurablesKeys = keyof DefaultConfigurables;
export type GasConfigurables = typeof gasConfig;
export type GasConfigurablesKeys = keyof GasConfigurables;

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
  setChainConfig: (params: Partial<GasConfigurables>) => {
    const configurableKeys = Object.keys(params);

    configurableKeys.forEach((key) => {
      if (key in gasConfig) {
        // @ts-ignore
        gasConfig[key] = params[key]!;
      }
    });
  },
  get: (key: DefaultConfigurablesKeys) => defaultConfig[key],
  getChainConfig: (key: GasConfigurablesKeys): number => gasConfig[key],
};
