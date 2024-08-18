import { B256Address, ZeroBytes32, Address } from 'fuels';

export const makeSigners = (subscribers: string[]) => {
  const array: B256Address[] = Array(10).fill(ZeroBytes32);
  subscribers.forEach((value, index) => {
    array[index] = Address.fromString(value).toB256();
  });
  return array;
};
