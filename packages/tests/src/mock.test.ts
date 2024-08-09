import { mockAuthService } from './mocks/api/auth';
import { TypeUser } from 'bakosafe/src/api/auth';

jest.mock('bakosafe/src/api/auth', () => {
  return {
    TypeUser: jest.requireActual('bakosafe/src/api/auth').TypeUser,
    AuthService: jest.fn().mockImplementation(() => mockAuthService),
  };
});

describe('AuthService Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return admin token for admin user', async () => {
    const response = await mockAuthService.auth({
      address: 'admin',
      provider: 'admin',
      type: TypeUser.FUEL,
    });
    expect(response).toEqual({
      code: 'random-code',
      validAt: expect.any(String),
      origin: 'random-origin',
    });
  });

  it('should return user token for user user', async () => {
    const response = await mockAuthService.sign({
      digest: 'digest',
      encoder: TypeUser.FUEL,
      signature: 'signature',
    });
    expect(response).toEqual({
      accessToken: 'signature',
      address: expect.any(String),
      avatar: expect.any(String),
      user_id: 'fake-user-id',
      workspace: expect.any(Object),
    });
  });
});
