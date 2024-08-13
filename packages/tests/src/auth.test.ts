import { TypeUser } from 'bakosafe';
import { accounts, networks } from './mocks';
import mockAuthService from './mocks/api/auth';
import { Address, Wallet } from 'fuels';

jest.mock('bakosafe/src/api/auth', () => {
  return {
    TypeUser: jest.requireActual('bakosafe/src/api/auth').TypeUser,
    AuthService: jest.fn().mockImplementation(() => mockAuthService),
  };
});

describe('[AUTH]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Authenticate', async () => {
    const auth = await mockAuthService.auth({
      address: accounts['USER_1'].address,
      provider: networks['DEVNET'],
      type: TypeUser.FUEL,
    });

    const signature = await Wallet.fromPrivateKey(
      accounts['USER_1'].privateKey,
    ).signMessage(auth.code);

    const { address, accessToken } = await mockAuthService.sign({
      digest: auth.code,
      encoder: TypeUser.FUEL,
      signature,
    });

    expect(address).toBe(accounts['USER_1'].address);
    expect(accessToken).toBe(signature);
  });

  it('List workspaces', async () => {
    const auth = await mockAuthService.auth({
      address: accounts['USER_1'].address,
      provider: networks['DEVNET'],
      type: TypeUser.FUEL,
    });

    const signature = await Wallet.fromPrivateKey(
      accounts['USER_1'].privateKey,
    ).signMessage(auth.code);

    await mockAuthService.sign({
      digest: auth.code,
      encoder: TypeUser.FUEL,
      signature,
    });

    const workspaces = await mockAuthService.getWorkspaces();

    expect(workspaces.length).toBeGreaterThanOrEqual(1);
    expect(workspaces[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      avatar: expect.any(String),
    });
  });

  it('Select workspace', async () => {
    const auth = await mockAuthService.auth({
      address: accounts['USER_1'].address,
      provider: networks['DEVNET'],
      type: TypeUser.FUEL,
    });

    const signature = await Wallet.fromPrivateKey(
      accounts['USER_1'].privateKey,
    ).signMessage(auth.code);

    await mockAuthService.sign({
      digest: auth.code,
      encoder: TypeUser.FUEL,
      signature,
    });

    const workspaces = await mockAuthService.getWorkspaces();

    expect(workspaces[0]).toBe(
      await mockAuthService.selectWorkspace(workspaces[0].id),
    );
  });
});
