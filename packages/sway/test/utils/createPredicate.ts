import { ZeroBytes32, Address, bn, Provider } from 'fuels';
import { VaultPredicate } from '../../../sdk/src/sway/predicates';
import { accounts } from '../../../sdk/test/mocks';
import { seedAccount } from './seedAccount';
import { CHAIN_URL } from './constants';

export const createPredicate = async ({
  amount = '0.1',
  minSigners = 3,
  signers = [
    accounts['USER_1'].account,
    accounts['USER_3'].account,
    accounts['USER_4'].account,
  ],
}: {
  amount: string;
  minSigners: number;
  signers: string[];
}) => {
  const provider = await Provider.create(CHAIN_URL);
  const _signers: [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ] = [
    ZeroBytes32,
    ZeroBytes32,
    ZeroBytes32,
    ZeroBytes32,
    ZeroBytes32,
    ZeroBytes32,
    ZeroBytes32,
    ZeroBytes32,
    ZeroBytes32,
    ZeroBytes32,
  ];

  for (let i = 0; i < 10; i++) {
    _signers[i] = signers[i] ?? ZeroBytes32;
  }

  const predicate = new VaultPredicate({
    provider,
    configurableConstants: {
      SIGNATURES_COUNT: minSigners ?? signers.length,
      SIGNERS: _signers,
      HASH_PREDICATE: Address.fromRandom().toB256(),
    },
  });

  await seedAccount(predicate.address, bn.parseUnits(amount), provider);

  return predicate;
};
