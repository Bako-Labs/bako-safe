import { ITransferAsset } from '../vault/assets';
import { BytesLike } from 'fuels';

/**
 * Enumeration of supported signature types for Bako encoding.
 */
export enum SignatureType {
  WebAuthn = 0,
  Fuel = 1,
  Evm = 2,
  RawNoPrefix = 9,
}

/**
 * Hexadecimal representations of signature types for low-level encoding.
 */
export const SIGNATURE_TYPE_HEX = {
  [SignatureType.WebAuthn]: '0000000000000000',
  [SignatureType.Fuel]: '0000000000000001',
  [SignatureType.Evm]: '0000000000000002',
  [SignatureType.RawNoPrefix]: '0000000000000009',
} as const;

/**
 * WebAuthn signature input structure.
 */
export type WebAuthnInput = {
  type: SignatureType.WebAuthn;
  signature: BytesLike;
  prefix: BytesLike;
  suffix: BytesLike;
  authData: BytesLike;
};

/**
 * Fuel wallet signature input structure.
 */
export type FuelInput = {
  type: SignatureType.Fuel;
  signature: BytesLike;
};

/**
 * EVM wallet signature input structure.
 */
export type EvmInput = {
  type: SignatureType.Evm;
  signature: BytesLike;
};

/**
 * Raw signature input without BAKO prefix.
 */
export type RawNoPrefixInput = {
  type: SignatureType.RawNoPrefix;
  signature: BytesLike;
};

/**
 * Union type of all supported signature input types.
 */
export type SignatureInput =
  | WebAuthnInput
  | FuelInput
  | EvmInput
  | RawNoPrefixInput;

/**
 * Type representing predicate versions that require byte array encoding.
 */
export type BytesVersion =
  '0xfdac03fc617c264fa6f325fd6f4d2a5470bf44cfbd33bc11efb3bf8b7ee2e938';

/**
 * List of predicate versions that require byte array encoding for transaction IDs.
 */
export const BYTE_VERSION_LIST = [
  '0xfdac03fc617c264fa6f325fd6f4d2a5470bf44cfbd33bc11efb3bf8b7ee2e938',
] as const;

/**
 * Coder operation types for different encoding needs.
 */
export type CoderOperation = {
  signature: SignatureInput;
  encoding: 'signature' | 'transaction';
};
