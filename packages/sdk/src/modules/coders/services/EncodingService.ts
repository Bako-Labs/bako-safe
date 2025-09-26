import { arrayify } from 'fuels';
import { stringToHex } from 'viem';
import { BYTE_VERSION_LIST, BytesVersion } from '../types';
import { getTxIdEncoded } from '..';
import { ENCODING_VERSIONS } from '../utils/versionsByEncode';

/**
 * Service class for encoding operations related to transaction IDs and general encoding tasks.
 */
export class EncodingService {
  /**
   * Set of predicate versions for efficient lookup of byte-encoding requirements.
   */
  private static readonly BYTE_VERSION_SET = new Set<string>(
    BYTE_VERSION_LIST as readonly string[],
  );


  /**
   * Encodes a transaction ID based on the predicate version requirements.
   */
  static encodeTxId(txId: string, version: string): Uint8Array | string {
    switch (true) {
      case EncodingService.BYTE_VERSION_SET.has(version):
        return arrayify(txId.startsWith('0x') ? txId : `0x${txId}`);
      default:
        return txId.startsWith('0x')
          ? stringToHex(txId.slice(2))
          : stringToHex(txId);
    }
  }

  /**
   * Encodes a transaction ID for BakoSafe predicates
   */
  static bakosafeEncode = (txId: string, version: string) => {
    return this.encodeTxId(txId, version) as string;
  };

  /**
   * Encodes a transaction ID for Connector predicates
   */
  static connectorEncode = (txId: string) => {
    return txId.startsWith('0x') ? txId : `0x${txId}`;
  };

  /**
 * Determines the encoding function for a given version
 */
  static determineEncodingFunction(version: string): (txId: string) => string {
    if (ENCODING_VERSIONS.with0xPrefix.includes(version)) {
      return this.connectorEncode;
    }

    if (ENCODING_VERSIONS.without0xPrefix.includes(version)) {
      return (txId: string) => this.bakosafeEncode(txId, version);
    }

    throw new Error(`Unsupported version: ${version}`);
  }

  /**
   * Encodes transaction ID based on version
   */
  static encodedMessage(txId: string, version: string): string {
    const encoded = this.determineEncodingFunction(version)(txId);
    return encoded;
  }

  /**
   * Checks if a predicate version requires byte array encoding.
   */
  static requiresByteEncoding(version: string): version is BytesVersion {
    return EncodingService.BYTE_VERSION_SET.has(version);
  }

  /**
   * Gets all predicate versions that require byte encoding.
   */
  static getByteVersions(): readonly string[] {
    return BYTE_VERSION_LIST;
  }
}