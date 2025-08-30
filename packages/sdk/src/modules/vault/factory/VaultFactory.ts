import { Provider } from 'fuels';
import { BakoProvider } from '../../provider';
import { Vault } from '../Vault';
import {
  VaultConfigurable,
  BakoConfigurableType,
  ConnectorConfigurableType,
} from '../types';
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
}
