import { BigNumberCoder, concat, hexlify } from 'fuels';

/**
 * BAKO signature prefix used to identify BAKO-encoded signatures
 *
 * This constant represents the hex string "0x42414b4f" which serves as
 * a unique identifier for signatures encoded using the BAKO format.
 */
export const PREFIX_BAKO_SIG = '0x42414b4f';

/**
 * A type representing a BakoCoder, which includes a specific type and an
 * encode function to convert data into a hex string.
 *
 * @template T - The type identifier for the coder
 * @template D - The data type that this coder can encode
 */
export type BakoCoder<T = unknown, D = unknown> = {
  type: T;
  encode(data: D): string;
};

/**
 * A class for managing multiple BakoCoders. Each coder is responsible for
 * encoding data of a specific type into a hex string, using a custom encoding function.
 *
 * This class provides a flexible way to handle different types of data encoding
 * by registering specific coders for each data type. It automatically adds
 * the BAKO prefix and type information to encoded data.
 *
 * @template ST - The signature type enum values
 * @template STS - The signature input types that extend the signature type
 *
 * @example
 * ```typescript
 * const coder = new Coder<SignatureType, SignatureInput>();
 * coder.addCoder(SignatureType.WebAuthn, (data) => {
 *   // Custom encoding logic for WebAuthn data
 *   return encodedString;
 * });
 *
 * const result = coder.encode(webAuthnData);
 * ```
 */
export class Coder<ST extends number, STS extends { type: ST }> {
  /**
   * Array of registered coders for different data types
   */
  coders: Array<BakoCoder> = [];

  /**
   * Adds a new coder for a specific type
   *
   * @param type - The type identifier for this coder
   * @param encode - The encoding function that converts data to a hex string
   *
   * @example
   * ```typescript
   * coder.addCoder(SignatureType.Fuel, (data) => {
   *   return hexlify(data.signature);
   * });
   * ```
   */
  addCoder<T extends ST>(
    type: T,
    encode: (data: Extract<STS, { type: T }>) => string,
  ) {
    this.coders.push({
      type,
      encode,
    });
  }

  /**
   * Retrieves a coder for a specific type
   *
   * @param type - The type identifier to search for
   * @returns The coder if found, null otherwise
   */
  getCoder(type: number): BakoCoder | null {
    return this.coders.find((c) => c.type === type) || null;
  }

  /**
   * Internal encoding method that handles the actual encoding logic
   *
   * This method adds the BAKO prefix and type information to the encoded data,
   * with special handling for RawNoPrefix signatures that don't include the prefix.
   *
   * @param data - The data to encode
   * @returns The encoded hex string
   * @throws {Error} If no encoder is found for the given type
   *
   * @private
   */
  _encode(data: STS): string {
    const coder = this.getCoder(data.type);
    if (!coder) {
      throw new Error('Encoder not found!');
    }
    if (data.type === 9) {
      // SignatureType.RawNoPrefix
      return hexlify(coder.encode(data));
    }

    return hexlify(
      concat([
        PREFIX_BAKO_SIG,
        new BigNumberCoder('u64').encode(data.type),
        coder.encode(data),
      ]),
    );
  }

  /**
   * Encodes data using the appropriate registered coder
   *
   * This method can handle both single items and arrays of items.
   * For single items, it returns a hex string. For arrays, it returns
   * an array of hex strings.
   *
   * @param data - The data to encode (single item or array)
   * @returns The encoded result(s) as hex string(s)
   *
   * @example
   * ```typescript
   * // Single item encoding
   * const singleResult = coder.encode(webAuthnData);
   *
   * // Array encoding
   * const arrayResult = coder.encode([webAuthnData, fuelData]);
   * ```
   */
  encode<A extends STS | Array<STS>, R = A extends STS[] ? string[] : string>(
    data: A,
  ): R {
    if (Array.isArray(data)) {
      return data.map((d) => this._encode(d)) as R;
    }
    return this._encode(data as STS) as R;
  }
}
