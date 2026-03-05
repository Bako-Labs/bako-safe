import { EncodingService, SignatureService } from './services';
import type { SigLoose } from './services';
import { DEFAULT_PREDICATE_VERSION } from '../../sway/predicates/predicateFinder';

/**
 * Centralized class for common encoding operations, such as signature serialization and transaction ID encoding.
 *
 * @example
 * ```ts
 * // Encode a wallet signature
 * const encodedSignature = CoderUtils.encodeSignature(wallet.address, signature);
 *
 * // Encode a transaction ID
 * const encodedTxId = CoderUtils.encodeTxId(txId, 'v1');
 * ```
 */
export class CoderUtils {
  /**
   * Encodes a signature for use with Bako predicates based on wallet type and predicate version.
   *
   * @param walletAddress - The wallet address associated with the signature.
   * @param signature - The raw or structured signature data.
   * @param predicateVersion - (Optional) Predicate version used for encoding.
   * Defaults to {@link DEFAULT_PREDICATE_VERSION}.
   * @returns The encoded signature as a string.
   */
  static encodeSignature(
    walletAddress: string,
    signature: SigLoose,
    predicateVersion: string = DEFAULT_PREDICATE_VERSION,
  ): string {
    return SignatureService.encode(walletAddress, signature, predicateVersion);
  }

  /**
   * Encodes a transaction ID based on the predicate version requirements.
   *
   * @param txId - The transaction ID to encode.
   * @param version - The version identifier for encoding.
   * @returns The encoded transaction ID as a `Uint8Array` or `string`,
   * depending on the encoding strategy.
   */
  static encodeTxId(txId: string, version: string): Uint8Array | string {
    return EncodingService.encodeTxId(txId, version);
  }
}
