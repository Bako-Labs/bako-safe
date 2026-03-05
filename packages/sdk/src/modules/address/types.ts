export enum Bech32Prefix {
  PASSKEY = 'passkey',
  SOCIAL = 'social',
}

export type Bech32 = `${Bech32Prefix}.${string}`;
