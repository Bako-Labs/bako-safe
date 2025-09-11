export enum Bech32Prefix {
  PASSKEY = 'passkey',
}

export type Bech32 = `${Bech32Prefix}.${string}`;

