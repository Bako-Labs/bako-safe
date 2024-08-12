import { ErrorCodes, IBakoError } from './types';
import { FuelError } from 'fuels';
import { FuelErrorParser } from './parser';

export class BakoError extends Error {
  static parse(error: unknown) {
    if (error instanceof FuelError) {
      const fuelError = FuelErrorParser.parse(error);
      return new BakoError(
        fuelError.code,
        fuelError.message,
        fuelError.metadata,
      );
    }

    if (error instanceof Object && 'message' in error) {
      return new BakoError(
        ErrorCodes.DEFAULT,
        (error.message as string) || 'Unknown error',
      );
    }

    return new BakoError(ErrorCodes.DEFAULT, 'Unknown error');
  }

  constructor(
    public code: ErrorCodes,
    public message: string,
    public versions?: Record<string, string>,
  ) {
    super(message);
  }

  toJSON(): IBakoError {
    return {
      code: this.code,
      message: this.message,
      versions: this.versions,
    };
  }
}
