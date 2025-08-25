import { BytesLike } from 'fuels';
import { walletOrigin } from '../../utils/vault/configurable';
import { WalletType } from '../../utils';
import { PredicateDevelopedBy } from '../../sway';
import {
  DEFAULT_PREDICATE_VERSION,
  getAllVersionsDetails,
} from '../../sway/predicates/predicateFinder';
import {
  bakoCoder,
  EvmInput,
  FuelInput,
  RawNoPrefixInput,
  SignatureType,
  WebAuthnInput,
} from './coders';

/**
 * Flexible signature type that accepts BytesLike data, signature objects, or WebAuthn inputs.
 */
type SigLoose = BytesLike | { signature: BytesLike } | WebAuthnInput;

/**
 * Type guard to check if a value is BytesLike (string or Uint8Array).
 *
 * @param x - The value to check.
 * @returns True if the value is BytesLike, false otherwise.
 */
const isBytesLike = (x: unknown): x is BytesLike =>
  typeof x === 'string' || x instanceof Uint8Array;

/**
 * Type guard to check if an object has a specific property.
 *
 * @param o - The object to check.
 * @param k - The property key to look for.
 * @returns True if the object has the property, false otherwise.
 */
const hasOwn = (o: unknown, k: string): o is Record<string, unknown> =>
  o != null &&
  typeof o === 'object' &&
  Object.prototype.hasOwnProperty.call(o as object, k);

/**
 * Type guard to check if a signature is a WebAuthn input.
 *
 * @param x - The signature to check.
 * @returns True if the signature is a WebAuthn input, false otherwise.
 */
const isWebAuthn = (x: SigLoose): x is WebAuthnInput =>
  !isBytesLike(x) &&
  hasOwn(x, 'signature') &&
  hasOwn(x, 'prefix') &&
  hasOwn(x, 'suffix') &&
  hasOwn(x, 'authData');

/**
 * Extracts the signature data from various signature formats.
 *
 * @param x - The signature in various formats.
 * @returns The extracted BytesLike signature data.
 */
const ensureSignature = (x: SigLoose): BytesLike =>
  isBytesLike(x) ? x : ((x as any).signature as BytesLike);

/**
 * Classification result for different signature types with their corresponding data.
 */
type Classified =
  | { kind: 'webauthn'; sig: Omit<WebAuthnInput, 'type'> }
  | { kind: 'fuel'; sig: Omit<FuelInput, 'type'> }
  | { kind: 'evm'; sig: Omit<EvmInput, 'type'> }
  | { kind: 'raw'; sig: Omit<RawNoPrefixInput, 'type'> };

/**
 * Classifies a signature based on wallet address and predicate version to determine
 * the appropriate encoding format.
 *
 * @param walletAddress - The wallet address to determine the signature type.
 * @param sig - The signature data in various supported formats.
 * @param predicateVersion - The predicate version to determine encoding rules.
 * @returns Classification result with signature type and processed data.
 * @throws Error if the predicate version is not found or wallet origin is unsupported.
 */
function classifySignature(
  walletAddress: string,
  sig: SigLoose,
  predicateVersion: string,
): Classified {
  const versions = getAllVersionsDetails();
  const current = versions[predicateVersion];
  if (!current) {
    throw new Error(
      `Predicate version ${predicateVersion} not found. Available versions: ${Object.keys(
        versions,
      ).join(', ')}`,
    );
  }

  if (current.developedBy === PredicateDevelopedBy.FuelLabs) {
    return { kind: 'raw', sig: { signature: ensureSignature(sig) } };
  }

  if (isWebAuthn(sig)) {
    return { kind: 'webauthn', sig };
  }

  const origin = walletOrigin(walletAddress);
  const signature = ensureSignature(sig);

  if (origin === WalletType.FUEL) return { kind: 'fuel', sig: { signature } };
  if (origin === WalletType.EVM) return { kind: 'evm', sig: { signature } };

  throw new Error(`Unsupported wallet origin: ${origin}`);
}

/**
 * Encodes a signature for use with Bako predicates based on wallet type and predicate version.
 * Automatically detects the signature format (WebAuthn, EVM, Fuel, or raw) and applies
 * the appropriate encoding with BAKO prefix and type information.
 *
 * @param walletAddress - The wallet address to determine the signature encoding type.
 * @param signature - The signature data in various supported formats (BytesLike, object, or WebAuthn).
 * @param predicateVersion - The predicate version to determine encoding rules (defaults to DEFAULT_PREDICATE_VERSION).
 * @returns The encoded signature as a hex string with appropriate BAKO formatting.
 * @throws Error if the predicate version is not found or wallet origin is unsupported.
 *
 * @example
 * ```typescript
 * // EVM signature
 * const encodedEvm = encodeSignature('0x742d35Cc6335C0532FDD5d9dA5Ac5Cd6C3f776a', signature);
 *
 * // Fuel signature
 * const encodedFuel = encodeSignature(fuelWallet.address.toB256(), signature);
 *
 * // WebAuthn signature
 * const encodedWebAuthn = encodeSignature(credentialId, webAuthnResult);
 * ```
 */
export function encodeSignature(
  walletAddress: string,
  signature: SigLoose,
  predicateVersion: string = DEFAULT_PREDICATE_VERSION,
): string {
  const c = classifySignature(walletAddress, signature, predicateVersion);

  switch (c.kind) {
    case 'webauthn':
      return bakoCoder.encode({
        type: SignatureType.WebAuthn,
        signature: c.sig.signature,
        prefix: c.sig.prefix,
        suffix: c.sig.suffix,
        authData: c.sig.authData,
      });

    case 'fuel':
      return bakoCoder.encode({
        type: SignatureType.Fuel,
        signature: c.sig.signature,
      });

    case 'evm':
      return bakoCoder.encode({
        type: SignatureType.Evm,
        signature: c.sig.signature,
      });

    case 'raw':
      return bakoCoder.encode({
        type: SignatureType.RawNoPrefix,
        signature: c.sig.signature,
      });
  }
}
