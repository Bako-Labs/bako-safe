export enum Batch32Prefix {
  PASSKEY = 'passkey',
}

export type Batch32 = `${Batch32Prefix}.${string}`;
