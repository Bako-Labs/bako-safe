import { Address } from 'fuels';

export const makeHashPredicate = () => Address.fromRandom().toB256();
