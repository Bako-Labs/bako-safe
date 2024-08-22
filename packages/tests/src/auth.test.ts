import { accounts, networks } from './mocks';
import { VaultProvider } from '../../sdk/src/modules/provider/VaultProvider';
import { Wallet } from 'fuels';

describe('[AUTH]', () => {
  it('Should authenticate with a token', async () => {
    const address = accounts['USER_1'].account;

    const challenge = await VaultProvider.setup({
      address,
    });

    const token = await Wallet.fromPrivateKey(
      accounts['USER_1'].privateKey,
    ).signMessage(challenge);

    const vaultProvider = await VaultProvider.create(networks['LOCAL'], {
      address,
      challenge,
      token,
    });

    // try an authenticated request
    const tokens = await vaultProvider.service.getToken();

    expect(vaultProvider).toBeDefined();
    expect(vaultProvider.options.address).toBe(address);
    expect(vaultProvider.options.token).toBe(token);
    expect(vaultProvider.options.challenge).toBe(challenge);
    expect(tokens).toBeDefined();
    expect(tokens.length).toBeGreaterThan(0);
  });
});
