import { BytesLike } from 'fuels';
import { walletOrigin, Wallet } from '../../vault/utils/configurable';
import { PredicateDevelopedBy } from '../../../sway';
import {
  DEFAULT_PREDICATE_VERSION,
  getAllVersionsDetails,
} from '../../../sway/predicates/predicateFinder';
import {
  SignatureType,
  WebAuthnInput,
  FuelInput,
  EvmInput,
  RawNoPrefixInput,
} from '../types';
import { CoderFactory } from '../factory';

/**
 * Flexible signature type that accepts BytesLike data, signature objects, or WebAuthn inputs.
 */
type SigLoose = BytesLike | { signature: BytesLike } | WebAuthnInput;

/**
 * Classification result for different signature types with their corresponding data.
 */
type Classified =
  | { kind: 'webauthn'; sig: Omit<WebAuthnInput, 'type'> }
  | { kind: 'fuel'; sig: Omit<FuelInput, 'type'> }
  | { kind: 'evm'; sig: Omit<EvmInput, 'type'> }
  | { kind: 'raw'; sig: Omit<RawNoPrefixInput, 'type'> };

/**
 * Service class for signature-related operations and encoding.
 */
export class SignatureService {
  /**
   * Type guard to check if a value is BytesLike (string or Uint8Array).
   */
  private static isBytesLike = (x: unknown): x is BytesLike =>
    typeof x === 'string' || x instanceof Uint8Array;

  /**
   * Type guard to check if an object has a specific property.
   */
  private static hasOwn = (
    o: unknown,
    k: string,
  ): o is Record<string, unknown> =>
    o != null &&
    typeof o === 'object' &&
    Object.prototype.hasOwnProperty.call(o as object, k);

  /**
   * Type guard to check if a signature is a WebAuthn input.
   */
  private static isWebAuthn = (x: SigLoose): x is WebAuthnInput =>
    !SignatureService.isBytesLike(x) &&
    SignatureService.hasOwn(x, 'signature') &&
    SignatureService.hasOwn(x, 'prefix') &&
    SignatureService.hasOwn(x, 'suffix') &&
    SignatureService.hasOwn(x, 'authData');

  /**
   * Extracts the signature data from various signature formats.
   */
  private static ensureSignature = (x: SigLoose): BytesLike =>
    SignatureService.isBytesLike(x) ? x : ((x as any).signature as BytesLike);

  /**
   * Classifies a signature based on wallet address and predicate version to determine
   * the appropriate encoding format.
   */
  private static classifySignature(
    walletAddress: string,
    sig: SigLoose,
    predicateVersion: string,
  ): Classified {
    const versions = getAllVersionsDetails();
    const availableVersions = Object.keys(versions).join(', ');
    const current = versions[predicateVersion];
    if (!current) {
      throw new Error(
        `Predicate version ${predicateVersion} not found. Available versions: ${availableVersions}`,
      );
    }

    if (current.developedBy === PredicateDevelopedBy.FuelLabs) {
      return {
        kind: 'raw',
        sig: { signature: SignatureService.ensureSignature(sig) },
      };
    }

    if (SignatureService.isWebAuthn(sig)) {
      return { kind: 'webauthn', sig };
    }

    const origin = walletOrigin(walletAddress);
    const signature = SignatureService.ensureSignature(sig);

    if (origin === Wallet.FUEL) return { kind: 'fuel', sig: { signature } };
    if (origin === Wallet.EVM) return { kind: 'evm', sig: { signature } };

    throw new Error(`Unsupported wallet origin: ${origin}`);
  }

  /**
   * Encodes a signature for use with Bako predicates based on wallet type and predicate version.
   */
  static encode(
    walletAddress: string,
    signature: SigLoose,
    predicateVersion: string = DEFAULT_PREDICATE_VERSION,
  ): string {
    const c = SignatureService.classifySignature(
      walletAddress,
      signature,
      predicateVersion,
    );
    const coder = CoderFactory.createFullCoder();

    switch (c.kind) {
      case 'webauthn':
        return coder.encode({
          type: SignatureType.WebAuthn,
          signature: c.sig.signature,
          prefix: c.sig.prefix,
          suffix: c.sig.suffix,
          authData: c.sig.authData,
        });

      case 'fuel':
        return coder.encode({
          type: SignatureType.Fuel,
          signature: c.sig.signature,
        });

      case 'evm':
        return coder.encode({
          type: SignatureType.Evm,
          signature: c.sig.signature,
        });

      case 'raw':
        return coder.encode({
          type: SignatureType.RawNoPrefix,
          signature: c.sig.signature,
        });
    }
  }
}
