import { BigNumberCoder, BytesLike, concat, hexlify } from 'fuels';

const PREFIX_BAKO_SIG = '0x42414b4f';

export type BakoCoder<T = unknown, D = unknown> = {
  type: T;
  encode(data: D): string;
};
export class BakoCoders<ST extends number, STS extends { type: ST }> {
  coders: Array<BakoCoder> = [];

  addCoder<T extends ST>(
    type: T,
    encode: (data: Extract<STS, { type: T }>) => string,
    // decode?: (data: string) => Extract<STS, { type: T }>,
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
