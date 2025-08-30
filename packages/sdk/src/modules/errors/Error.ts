import { ErrorCodes, IBakoError } from './types';
import { FuelError } from 'fuels';
import { FuelErrorParser } from './parser';

export class BakoError extends Error {
  static parse(error: unknown) {
    // Workaround to check if error is a FuelError because instanceof doesn't parse correctly
    const isFuelError =
      error instanceof Object &&
      'code' in error &&
      'VERSIONS' in error &&
      'message' in error;

    if (isFuelError) {
      const fuelError = FuelErrorParser.parse(<FuelError>error);
      return new BakoError(fuelError.code, fuelError.message);
    }

    if (error instanceof Object && 'message' in error) {
      return new BakoError(ErrorCodes.DEFAULT, error.message as string);
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
