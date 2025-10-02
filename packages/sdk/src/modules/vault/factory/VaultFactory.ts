import { Provider } from 'fuels';
import { BakoProvider } from '../../provider';
import { Vault } from '../Vault';
import {
  VaultConfigurable,
  BakoConfigurableType,
  ConnectorConfigurableType,
  VaultConfig,
} from '../types';
import { parseConfig } from '../utils';
import { CompatibilityService } from '../services';
import { versions } from '../../../sway';
import { VaultConfigurationFactory } from './VaultConfigurationFactory';

/**
 * Factory class for creating Vault instances with simplified API
 */
export class VaultFactory {
  /**
   * Creates a Bako multi-signature vault
   *
   * @param provider - The provider instance
   * @param config - Bako vault configuration
   * @param version - Optional predicate version
   * @returns A new Vault instance configured for Bako multi-sig
   */
  static createBakoVault(
    provider: Provider | BakoProvider,
    config: BakoConfigurableType,
    version?: string,
  ): Vault {
    return new Vault(provider, config, version);
  }

  /**
   * Creates a Connector vault for external wallet integration
   *
   * @param provider - The provider instance
   * @param config - Connector vault configuration
   * @param version - Optional predicate version
   * @returns A new Vault instance configured for connector
   */
  static createConnectorVault(
    provider: Provider | BakoProvider,
    config: ConnectorConfigurableType,
    version?: string,
  ): Vault {
    return new Vault(provider, config, version);
  }

  /**
   * Creates a vault from BakoProvider authentication
   *
   * @param provider - BakoProvider with authentication
   * @param version - Optional predicate version override
   * @returns A new Vault instance from provider auth
   */
  static createFromProvider(provider: BakoProvider, version?: string): Vault {
    if (!('cliAuth' in provider) || !provider.cliAuth) {
      throw new Error('BakoProvider must have authentication configured');
    }

    return new Vault(
      provider,
      provider.cliAuth.configurable,
      version ?? provider.cliAuth.version,
    );
  }

  /**
   * Recovers a vault from an existing predicate address
   *
   * @param address - The predicate address
   * @param provider - BakoProvider instance
   * @returns A recovered Vault instance
   */
  static async fromAddress(
    address: string,
    provider: BakoProvider,
  ): Promise<Vault> {
    const { configurable, version } =
      await provider.findPredicateByAddress(address);
    return new Vault(provider, configurable, version);
  }

  /**
   * Creates a vault with automatic type detection
   *
   * @param provider - The provider instance
   * @param config - Vault configuration (auto-detected type)
   * @param version - Optional predicate version
   * @returns A new Vault instance
   */
  static createVault(
    provider: Provider | BakoProvider,
    config: VaultConfigurable,
    version?: string,
  ): Vault {
    return new Vault(provider, config, version);
  }

  /**
   * Creates a vault with parsed configuration and type validation
   *
   * @param provider - The provider instance
   * @param config - Vault configuration (string or object)
   * @param version - Optional predicate version
   * @returns A new Vault instance with parsed config
   */
  static createVaultWithParsedConfig(
    provider: Provider | BakoProvider,
    config: VaultConfigurable | string,
    version?: string,
  ): Vault {
    const parsedConfig = parseConfig(config as VaultConfigurable);
    return new Vault(provider, parsedConfig, version);
  }

  /**
   * Creates a vault only if the configuration is compatible with the specified version
   *
   * @param provider - The provider instance
   * @param config - Vault configuration
   * @param version - Required predicate version
   * @returns A new Vault instance if compatible
   * @throws Error if configuration is not compatible with the version
   */
  static createCompatibleVault(
    provider: Provider | BakoProvider,
    config: VaultConfigurable,
    version: string,
  ): Vault {
    if (!CompatibilityService.isCompatibleWith(config, version)) {
      throw new Error(
        `Configuration is not compatible with version ${version}`,
      );
    }
    return new Vault(provider, config, version);
  }

  /**
   * Validates if a configuration is compatible with a specific version
   *
   * @param config - Vault configuration to validate
   * @param version - Version to check compatibility against
   * @returns True if compatible, false otherwise
   */
  static isConfigurationCompatible(
    config: VaultConfigurable,
    version: string,
  ): boolean {
    return CompatibilityService.isCompatibleWith(config, version);
  }

  /**
   * Parses a configuration and returns the typed result
   *
   * @param config - Vault configuration (string or object)
   * @returns Parsed configuration with type information
   */
  static parseConfiguration(config: VaultConfigurable | string): VaultConfig {
    return parseConfig(config as VaultConfigurable);
  }

  /**
   * Checks if a configuration is compatible with a specific version.
   *
   * @param version - The predicate version to check compatibility with
   * @param config - The vault configuration to validate
   * @returns True if the configuration is compatible with the version
   * @throws Error if the version is not found or configuration is invalid
   */
  static isCompatibleWith(
    version: string,
    config: VaultConfigurable | string,
  ): boolean {
    return CompatibilityService.isCompatibleWith(config, version);
  }
}
