import { BytesLike, concat, hexlify, arrayify, BigNumberCoder } from 'fuels';
import { splitSignature } from '@ethersproject/bytes';
import { hexToBytes } from '@ethereumjs/util';

import { Coder } from '../coder';
import {
  SignatureType,
  SignatureInput,
  WebAuthnInput,
  FuelInput,
  EvmInput,
  RawNoPrefixInput,
} from '../types';

/**
 * Configuration result for coder creation
 */
export interface CoderConfiguration {
  coder: Coder<SignatureType, SignatureInput>;
  encoders: Array<{ type: SignatureType; name: string }>;
}

/**
 * Factory responsible for creating coder configurations based on different requirements
 */
export class CoderConfigurationFactory {
  /**
   * Creates a full configuration with all signature type encoders
   */
  static createFullConfiguration(): CoderConfiguration {
    const coder = new Coder<SignatureType, SignatureInput>();

    // Register WebAuthn encoder
    coder.addCoder(SignatureType.WebAuthn, (data: WebAuthnInput) => {
      const signatureBytes = arrayify(data.signature);
      const prefixBytes = arrayify(data.prefix);
      const suffixBytes = arrayify(data.suffix);
      const authDataBytes = arrayify(data.authData);
      return hexlify(
        concat([
          signatureBytes,
          new BigNumberCoder('u64').encode(prefixBytes.length), // prefix size
          new BigNumberCoder('u64').encode(suffixBytes.length), // suffix size
          new BigNumberCoder('u64').encode(authDataBytes.length), // authdata size
          prefixBytes,
          suffixBytes,
          authDataBytes,
        ]),
      );
    });

    // Register Fuel encoder
    coder.addCoder(SignatureType.Fuel, (data: FuelInput) => {
      return hexlify(arrayify(data.signature));
    });

    // Register EVM encoder
    coder.addCoder(SignatureType.Evm, (data: EvmInput) => {
      return splitSignature(hexToBytes(hexlify(data.signature))).compact;
    });

    // Register Raw (no prefix) encoder
    coder.addCoder(SignatureType.RawNoPrefix, (data: RawNoPrefixInput) => {
      return splitSignature(hexToBytes(hexlify(data.signature))).compact;
    });

    return {
      coder,
      encoders: [
        { type: SignatureType.WebAuthn, name: 'WebAuthn' },
        { type: SignatureType.Fuel, name: 'Fuel' },
        { type: SignatureType.Evm, name: 'EVM' },
        { type: SignatureType.RawNoPrefix, name: 'RawNoPrefix' },
      ],
    };
  }

  /**
   * Creates a minimal configuration with only basic encoders
   */
  static createMinimalConfiguration(): CoderConfiguration {
    const coder = new Coder<SignatureType, SignatureInput>();

    // Register only Fuel and EVM encoders for minimal setup
    coder.addCoder(SignatureType.Fuel, (data: FuelInput) => {
      return hexlify(arrayify(data.signature));
    });

    coder.addCoder(SignatureType.Evm, (data: EvmInput) => {
      return splitSignature(hexToBytes(hexlify(data.signature))).compact;
    });

    return {
      coder,
      encoders: [
        { type: SignatureType.Fuel, name: 'Fuel' },
        { type: SignatureType.Evm, name: 'EVM' },
      ],
    };
  }

  /**
   * Creates configuration based on requirements
   */
  static createConfiguration(minimal: boolean = false): CoderConfiguration {
    return minimal
      ? this.createMinimalConfiguration()
      : this.createFullConfiguration();
  }
}
