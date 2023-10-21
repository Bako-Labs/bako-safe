import { bn } from 'fuels';

export const defaultConfigurable = {
    api_token: '',
    encoder: 'fuel',
    api_url: 'http://localhost:3333',
    provider: 'http://localhost:4000/graphql',
    gasPrice: bn(1_000_000),
    gasLimit: bn(100000),
    refetchTimeout: 1000
};
