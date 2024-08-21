import { networks } from './mocks';
import { VaultProvider } from '../../sdk/src/modules/provider/VaultProvider';

describe('[AUTH]', () => {
  it('Should authenticate with a token', async () => {
    const vaultProvider = await VaultProvider.create(networks['LOCAL'], {});

    console.log('vaultProvider', vaultProvider);
  });
});
