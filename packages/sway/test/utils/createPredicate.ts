import { ZeroBytes32, Address, bn, Provider } from 'fuels';
import { PredicateAbi__factory } from '../../../sdk/src/sway/predicates';
import { accounts } from '../../../sdk/test/mocks';
import { seedAccount } from './seedAccount';
import { _signers } from './constants';

export const createPredicate = async ({
  provider,
  amount = '0.1',
  minSigners = 3,
  signers = [
    accounts['USER_1'].account,
    accounts['USER_3'].account,
    accounts['USER_4'].account,
  ],
}: {
  provider: Provider;
  amount: string;
  minSigners: number;
  signers: string[];
}) => {
  for (let i = 0; i < 10; i++) {
    _signers.push(signers[i] ?? ZeroBytes32);
  }

  const predicate = PredicateAbi__factory.createInstance(provider, [], {
    SIGNATURES_COUNT: minSigners ?? signers.length,
    SIGNERS: _signers,
    HASH_PREDICATE: Address.fromRandom().toB256(),
  });

  await seedAccount(predicate.address, bn.parseUnits(amount), provider);

  return predicate;
};
