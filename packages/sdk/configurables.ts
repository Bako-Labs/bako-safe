const {
  PROVIDER,
  API_URL,
  BSAFE_URL,
  ENCODER,
  GAS_PRICE,
  GAS_LIMIT,
  REFETCH_TIMEOUT,
} = process.env;

type DefaultConfigurables = {
  PROVIDER: string;
  API_URL: string;
  BSAFE_URL: string;
  ENCODER: string;
  GAS_PRICE: string;
  GAS_LIMIT: string;
  REFETCH_TIMEOUT: string;
};

export const defaultConfig = {
  PROVIDER,
  API_URL,
  BSAFE_URL,
  ENCODER,
  GAS_PRICE,
  GAS_LIMIT,
  REFETCH_TIMEOUT,
};

export const BSafe = {
  setup: (params: DefaultConfigurables) => {
    const configurableKeys = Object.keys(
      params,
    ) as unknown as (keyof DefaultConfigurables)[];

    configurableKeys.forEach((key) => {
      if (key in defaultConfig) {
        defaultConfig[key] = params[key]!;
      }
    });
  },
};
