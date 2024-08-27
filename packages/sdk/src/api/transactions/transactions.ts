import { Api } from '../api';
import type { IBakoSafeAuth } from '../auth/types';
import type {
  ICreateTransactionPayload,
  ITransaction,
  ITransactionService,
  ITransactionStatusResponse,
} from './types';

export class TransactionService extends Api implements ITransactionService {
  public async create(payload: ICreateTransactionPayload) {
    try {
      const { data } = await this.client.post<ITransaction>(
        '/transaction',
        payload,
      );

      return data;
    } catch (_e) {
      throw new Error('ERRO AO CRIAR');
    }
  }

  public async findByHash(hash: string) {
    const { data } = await this.client.get<ITransaction>(
      `/transaction/by-hash/${hash}`,
    );

    return data;
  }

  public async findByTransactionID(transactionId: string) {
    const { data } = await this.client.get<ITransaction>(
      `/transaction/${transactionId}`,
    );

    return data;
  }

  public async sign(
    BakoSafeTransactionId: string,
    account: string,
    signer: string,
    approve?: boolean,
  ) {
    const { data } = await this.client.put(
      `/transaction/signer/${BakoSafeTransactionId}`,
      {
        account,
        signer,
        confirm: approve ?? true,
      },
    );

    return data;
  }

  public async send(BakoSafeTransactionId: string) {
    const { data } = await this.client.post(
      `/transaction/send/${BakoSafeTransactionId}`,
    );

    return data;
  }

  public async verify(BakoSafeTransactionId: string) {
    const { data } = await this.client.post(
      `/transaction/verify/${BakoSafeTransactionId}`,
    );

    return data;
  }

  public async status(BakoSafeTransactionId: string) {
    const { data } = await this.client.get<ITransactionStatusResponse>(
      `/transaction/status/${BakoSafeTransactionId}`,
    );

    return data.status;
  }
}
