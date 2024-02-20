import { Address, B256Address, ZeroBytes32 } from 'fuels';

export const defaultValues: { [name: string]: string } = {
  signature:
    '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  address: '0x0000000000000000000000000000000000000000000000000000000000000000',
};

export const makeHashPredicate = () => Address.fromRandom().toB256();

export const makeSubscribers = (subscribers: string[]) => {
  const array: B256Address[] = Array(10).fill(ZeroBytes32);
  subscribers.forEach((value, index) => {
    array[index] = Address.fromString(value).toB256();
  });
  return array;
};
