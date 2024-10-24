export const networks: { [key: string]: string } = {
  TESNET: 'https://testnet.fuel.network/v1/graphql',
  MAINNET: 'https://mainnet.fuel.network/v1/graphql',
};

export type INetworkKeys = keyof typeof networks;
