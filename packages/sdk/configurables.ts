const {
  PROVIDER,
  API_URL,
  BSAFE_URL,
  ENCODER,
  GAS_PRICE,
  GAS_LIMIT,
  REFETCH_TIMEOUT,
} = process.env;

export const defaultConfig = {
  PROVIDER,
  API_URL,
  BSAFE_URL,
  ENCODER,
  GAS_PRICE,
  GAS_LIMIT,
  REFETCH_TIMEOUT,
};

export type DefaultConfigurables = typeof defaultConfig;
export type DefaultConfigurablesKeys = keyof DefaultConfigurables;

export const BSafe = {
  setup: (params: Partial<DefaultConfigurables>) => {
    const configurableKeys = Object.keys(params);

    configurableKeys.forEach((key) => {
      if (key in defaultConfig) {
        defaultConfig[key] = params[key]!;
      }
    });
  },
  get: (key: DefaultConfigurablesKeys) => defaultConfig[key],
};
