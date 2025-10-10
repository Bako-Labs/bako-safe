/**
 * Coder module for Bako Safe
 *
 * This module provides comprehensive encoding and decoding functionality
 * for different types of signatures and transaction data used in the
 * Bako Safe system.
 *
 * The module includes:
 * - Core Coder class for managing multiple encoders
 * - Type definitions for different signature formats
 * - Factory classes for creating configured coders
 * - Services for signature encoding and transaction ID encoding
 * - Backward compatibility exports (deprecated)
 *
 * @module coders
 */

export * from './coder';
export * from './types';
export * from './services';
export { CoderUtils } from './CoderUtils';

// Backward compatibility - deprecated exports
import { CoderFactory } from './factory';
import { SignatureService, EncodingService } from './services';

/**
 * @deprecated Use CoderFactory.createFullCoder() instead
 *
 * This export is maintained for backward compatibility but should not
 * be used in new code. Use the factory pattern instead for better
 * configuration control and testing.
 */
export const bakoCoder = CoderFactory.createFullCoder();

/**
 * @deprecated Use CoderUtils.encodeSignature() instead
 *
 * This export is maintained for backward compatibility but should not
 * be used in new code. Use the SignatureService class directly for
 * better error handling and type safety.
 */
export const encodeSignature = SignatureService.encode;

/**
 * @deprecated Use CoderUtils.encodeTxId() instead
 *
 * This export is maintained for backward compatibility but should not
 * be used in new code. Use the EncodingService class directly for
 * better error handling and type safety.
 */
export const getTxIdEncoded = EncodingService.encodeTxId;
