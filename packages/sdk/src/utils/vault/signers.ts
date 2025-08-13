import { B256Address, ZeroBytes32, Address } from 'fuels';

export function makeSigners(subscribers: string): B256Address;
export function makeSigners(subscribers: string[]): B256Address[];

export function makeSigners(
  subscribers: string | string[],
): B256Address | B256Address[] {
  if (typeof subscribers === 'string') {
    return new Address(subscribers).toB256();
  }

  const maxLen = 10;
  const result: B256Address[] = Array(maxLen).fill(ZeroBytes32);

  for (let i = 0; i < Math.min(subscribers.length, maxLen); i++) {
    result[i] = new Address(subscribers[i]).toB256();
  }

  return result;
}
