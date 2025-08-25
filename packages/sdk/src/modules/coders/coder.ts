import { BigNumberCoder, concat, hexlify } from 'fuels';
import { SignatureType } from './coders';

export const PREFIX_BAKO_SIG = '0x42414b4f';

/**
 * A type representing a BakoCoder, which includes a specific type and an
 * encode function to convert data into a hex string.
 *
 * @template T The type of the data being encoded.
 * @template D The data structure used by the encoder.
 */
export type BakoCoder<T = unknown, D = unknown> = {
  type: T;
  encode(data: D): string;
};

/**
 * A class for managing multiple BakoCoders. Each coder is responsible for
 * encoding data of a specific type into a hex string, using a custom encoding function.
 *
 * @template ST The type signature of the supported types.
 * @template STS The structure containing a `type` field corresponding to `ST`.
 */
export class BakoCoders<ST extends number, STS extends { type: ST }> {
  /**
   * An array that holds the registered coders.
   * @type {Array<BakoCoder>}
   */
  coders: Array<BakoCoder> = [];

  /**
   * Adds a new coder to the BakoCoders instance.
   *
   * @template T The type signature of the coder.
   * @param {T} type The type identifier for the coder.
   * @param {(data: Extract<STS, { type: T }>) => string} encode The function responsible for encoding the data.
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
   * Retrieves a coder by its type.
   *
   * @param {number} type The type identifier to find the corresponding coder.
   * @returns {BakoCoder | null} The found coder or `null` if no coder matches the type.
   */
  getCoder(type: number): BakoCoder | null {
    return this.coders.find((c) => c.type === type) || null;
  }

  /**
   * Encodes a single data object using the registered coders.
   * Throws an error if no encoder is found for the given type.
   *
   * @param {STS} data The data object to encode.
   * @returns {string} The encoded hex string.
   * @throws {Error} If no coder is found for the given type.
   */
  _encode(data: STS): string {
    const coder = this.getCoder(data.type);
    if (!coder) {
      throw new Error('Encoder not found!');
    }
    if (data.type === SignatureType.RawNoPrefix) {
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
   * Encodes one or more data objects. If an array of data objects is passed,
   * it encodes each one individually and returns an array of encoded strings.
   *
   * @template A Either a single data object or an array of data objects.
   * @template R The return type, which is either a string or an array of strings depending on the input.
   * @param {A} data The data object(s) to encode.
   * @returns {R} The encoded hex string or an array of encoded hex strings.
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
