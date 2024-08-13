import { mockAuthService } from './mocks/api/auth';
import { TypeUser } from 'bakosafe/src/api/auth';
import mockPredicateService from './mocks/api/predicates';
import { Address, Wallet } from 'fuels';
import { configurable } from './mocks/predicates';
import { accounts } from './mocks/accounts';
import { networks } from './mocks';

jest.mock('bakosafe/src/api/auth', () => {
  return {
    TypeUser: jest.requireActual('bakosafe/src/api/auth').TypeUser,
    AuthService: jest.fn().mockImplementation(() => mockAuthService),
    PredicateService: jest.fn().mockImplementation(() => mockPredicateService),
  };
});

describe('AuthService Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // it('should return admin token for admin user', async () => {
  //   const { code } = await mockAuthService.auth({
  //     address: 'admin',
  //     provider: 'admin',
  //     type: TypeUser.FUEL,
  //   });
  //   expect(response).toEqual({
  //     code: 'random-code',
  //     validAt: expect.any(String),
  //     origin: 'random-origin',
  //   });
  // });

  // it('should return user token for user user', async () => {
  //   const response = await mockAuthService.sign({
  //     digest: 'digest',
  //     encoder: TypeUser.FUEL,
  //     signature: 'signature',
  //   });
  //   expect(response).toEqual({
  //     accessToken: 'signature',
  //     address: expect.any(String),
  //     avatar: expect.any(String),
  //     user_id: 'fake-user-id',
  //     workspace: expect.any(Object),
  //   });
  // });

  it('create a new predicate', async () => {
    const conf = JSON.parse(configurable['PREDICATE_1']);
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

    const { id } = await mockPredicateService.create({
      name: 'predicate by test',
      predicateAddress: Address.fromRandom().toB256(),
      minSigners: 1,
      addresses: [Address.fromRandom().toB256()],
      configurable: configurable['PREDICATE_1'],
      provider: conf.network,
    });

    const predicate = await mockPredicateService.findById(id);

    expect(id).toEqual(predicate.id);

    // console.log(result);
    //expect(result).toEqual(predicate);
  });
});
