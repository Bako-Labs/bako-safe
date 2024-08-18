import { ErrorCode, FuelError } from 'fuels';
import { BakoError, ErrorCodes } from 'bakosafe/src';

const createFuelError = (message: string) =>
  new FuelError(ErrorCode.TRANSACTION_FAILED, message);

describe('[ERRORS]', () => {
  it('Parse fuel error to bako error', () => {
    const utxoError = createFuelError(
      'Transaction is not inserted. UTXO does not exist',
    );
    const utxoBakoError = BakoError.parse(utxoError);

    expect(utxoBakoError.code).toBe(ErrorCodes.UTXO_NOT_EXISTS);

    const predicateValidationError = createFuelError(
      'Invalid transaction data: PredicateVerificationFailed(Panic(PredicateReturnedNonOne))',
    );
    const predicateValidationBakoError = BakoError.parse(
      predicateValidationError,
    );

    expect(predicateValidationBakoError.code).toBe(
      ErrorCodes.PREDICATE_VALIDATION_FAILED,
    );
  });

  it('Parse unknown error to default bako error', () => {
    const unknownError = new Error('Error not in map');
    const unknownBakoError = BakoError.parse(unknownError);

    expect(unknownBakoError.code).toBe(ErrorCodes.DEFAULT);
  });
});
