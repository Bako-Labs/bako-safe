export const networks: { [key: string]: string } = {
  LOCAL: 'http://127.0.0.1:4000/v1/graphql',
  TESNET: 'https://testnet.fuel.network/v1/graphql',
};

export type INetworkKeys = keyof typeof networks;
