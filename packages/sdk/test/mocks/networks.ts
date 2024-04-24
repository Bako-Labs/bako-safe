export const networks: { [key: string]: string } = {
  BETA_5: 'https://beta-5.fuel.network/graphql',
  LOCAL: 'http://127.0.0.1:4000/graphql',
};

export type INetworkKeys = keyof typeof networks;
