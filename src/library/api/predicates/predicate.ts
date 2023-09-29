import { defaultConfigurable } from '../../configurables';
import { Api } from '../api';
import { IPredicatePayload, IPredicateService } from './types';

export class PredicateService extends Api implements IPredicateService {
    constructor() {
        super(defaultConfigurable['api_url'], defaultConfigurable['api_token']);
    }

    public async create(payload: IPredicatePayload) {
        const { data } = await this.client.post('/predicate', payload);

        return data;
    }

    public async findByAddress(predicateAddress: string) {
        const { data } = await this.client.get(`/predicate/by-address/${predicateAddress}`);

        return data;
    }

    public async hasReservedCoins(predicateAddress: string) {
        const { data } = await this.client.get(`/predicate/reserved-coins/${predicateAddress}`);

        return data;
    }
}
