import { BigNumberCoder, concat, hexlify } from 'fuels';

export const PREFIX_BAKO_SIG = '0x42414b4f';

/**
 * A type representing a BakoCoder, which includes a specific type and an
 * encode function to convert data into a hex string.
 */
export type BakoCoder<T = unknown, D = unknown> = {
  type: T;
  encode(data: D): string;
};

/**
 * A class for managing multiple BakoCoders. Each coder is responsible for
 * encoding data of a specific type into a hex string, using a custom encoding function.
 */
export class Coder<ST extends number, STS extends { type: ST }> {
  coders: Array<BakoCoder> = [];

  addCoder<T extends ST>(
    type: T,
    encode: (data: Extract<STS, { type: T }>) => string,
  ) {
    this.coders.push({
      type,
      encode,
    });
  }

  getCoder(type: number): BakoCoder | null {
    return this.coders.find((c) => c.type === type) || null;
  }

  _encode(data: STS): string {
    const coder = this.getCoder(data.type);
    if (!coder) {
      throw new Error('Encoder not found!');
    }
    if (data.type === 9) { // SignatureType.RawNoPrefix
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

  encode<A extends STS | Array<STS>, R = A extends STS[] ? string[] : string>(
    data: A,
  ): R {
    if (Array.isArray(data)) {
      return data.map((d) => this._encode(d)) as R;
    }
    return this._encode(data as STS) as R;
  }
}
