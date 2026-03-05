import { Coder } from '../coder';
import { SignatureType, SignatureInput } from '../types';
import { CoderConfigurationFactory } from './CoderConfigurationFactory';

/**
 * Factory class for creating Coder instances with simplified API
 */
export class CoderFactory {
  /**
   * Creates a fully configured coder with all signature type encoders
   *
   * @returns A new Coder instance configured for all signature types
   */
  static createFullCoder(): Coder<SignatureType, SignatureInput> {
    const { coder } = CoderConfigurationFactory.createFullConfiguration();
    return coder;
  }

  /**
   * Creates a minimal coder with only basic encoders (Fuel + EVM)
   *
   * @returns A new Coder instance configured for basic signature types
   */
  static createMinimalCoder(): Coder<SignatureType, SignatureInput> {
    const { coder } = CoderConfigurationFactory.createMinimalConfiguration();
    return coder;
  }

  /**
   * Creates a coder with automatic configuration selection
   *
   * @param minimal - Whether to create a minimal configuration
   * @returns A new Coder instance
   */
  static createCoder(minimal: boolean = false): Coder<SignatureType, SignatureInput> {
    const { coder } = CoderConfigurationFactory.createConfiguration(minimal);
    return coder;
  }

  // Backward compatibility methods

  /**
   * @deprecated Use createFullCoder() instead
   */
  static createBakoCoder(): Coder<SignatureType, SignatureInput> {
    return CoderFactory.createFullCoder();
  }
}

