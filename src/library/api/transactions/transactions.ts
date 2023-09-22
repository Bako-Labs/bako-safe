import { defaultConfigurable } from '../../configurables';
import { Api } from '../api';
import { ICreateTransactionPayload, ITransactionService } from './types';

export class TransactionService extends Api implements ITransactionService {
    constructor() {
        super(defaultConfigurable['api_url'], defaultConfigurable['api_token']);
    }

    public async create(payload: ICreateTransactionPayload) {
        const { data } = await this.client.post('/transaction', payload);

        return data;
    }

    public async findByHash(hash: string) {
        const { data } = await this.client.get(`/transaction/by-hash/${hash}`);

        return data;
    }
}
