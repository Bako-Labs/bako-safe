export * from './Coder';
export * from './types';
export * from './factory';
export * from './services';

// Backward compatibility - deprecated exports
import { CoderFactory } from './factory';
import { SignatureService, EncodingService } from './services';

/**
 * @deprecated Use CoderFactory.createFullCoder() instead
 */
export const bakoCoder = CoderFactory.createFullCoder();

/**
 * @deprecated Use SignatureService.encode() instead
 */
export const encodeSignature = SignatureService.encode;

/**
 * @deprecated Use EncodingService.encodeTxId() instead
 */
export const getTxIdEncoded = EncodingService.encodeTxId;
