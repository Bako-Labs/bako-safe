import { FuelError } from 'fuels';
import { ErrorCodes, ErrorMessages, ErrorMessagesMapper } from './types';

interface FuelErrorObject {
  message: string;
  VERSIONS: unknown; // Substitua `unknown` pelo tipo correto de VERSIONS, se disponível
}

export class FuelErrorParser {
  static parse(error: FuelError) {
    const { message, VERSIONS }: FuelErrorObject =
      error.toObject() as FuelErrorObject;

    const messages = Object.keys(ErrorMessagesMapper) as ErrorCodes[];
    const code = messages.find((code) =>
      message.includes(ErrorMessagesMapper[code]),
    );

    if (code) {
      return {
        code,
        message: ErrorMessages[code],
        metadata: VERSIONS,
      };
    }

    return {
      code: ErrorCodes.DEFAULT,
      message,
      metadata: VERSIONS,
    };
  }
}
