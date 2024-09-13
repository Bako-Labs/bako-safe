export enum ErrorCodes {
  UTXO_NOT_EXISTS = 'utxo_not_exists',
  NOT_ENOUGH_COINS = 'not_enough_coins',
  PREDICATE_VALIDATION_FAILED = 'predicate_validation_failed',
  OUT_OF_GAS = 'out_of_gas',
  INSUFFICIENT_INPUT_AMOUNT = 'insufficient_input_amount',
  DEFAULT = 'default',
}

export const ErrorMessages = {
  [ErrorCodes.UTXO_NOT_EXISTS]: 'UTXO does not exist',
  [ErrorCodes.NOT_ENOUGH_COINS]: 'Not enough coins',
  [ErrorCodes.PREDICATE_VALIDATION_FAILED]: 'Predicate validation failed',
  [ErrorCodes.OUT_OF_GAS]: 'Out of gas',
  [ErrorCodes.INSUFFICIENT_INPUT_AMOUNT]: 'Insufficient input amount',
  [ErrorCodes.DEFAULT]: '',
};

export const ErrorMessagesMapper = {
  [ErrorCodes.UTXO_NOT_EXISTS]: 'UTXO does not exist',
  [ErrorCodes.NOT_ENOUGH_COINS]: 'Not enough coins',
  [ErrorCodes.PREDICATE_VALIDATION_FAILED]: 'Panic(PredicateReturnedNonOne)',
  [ErrorCodes.OUT_OF_GAS]: 'PredicateVerificationFailed(OutOfGas)',
  [ErrorCodes.INSUFFICIENT_INPUT_AMOUNT]: 'Validity(InsufficientInputAmount',
  [ErrorCodes.DEFAULT]: '',
};

export interface IBakoError {
  code: ErrorCodes;
  message: typeof ErrorMessages | string;
  versions?: Record<string, string>;
}
