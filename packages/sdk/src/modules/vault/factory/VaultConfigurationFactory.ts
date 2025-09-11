import { Provider } from 'fuels';
import { BakoProvider } from '../../provider';
import {
  VaultConfigurable,
  BakoConfigurableType,
  ConnectorConfigurableType,
} from '../types';
import { makeSigners, makeHashPredicate } from '../utils';
import { isConnectorConfig, walletOrigin, Wallet } from '../utils/configurable';
import { loadPredicate } from '../../../sway';
import { CompatibilityService } from '../services';

/**
 * Configuration result for vault creation
 */
export interface VaultConfiguration {
  config: VaultConfigurable;
  predicateLoader: ReturnType<typeof loadPredicate>;
  data?: [];
  version: string;
}

/**
 * Factory responsible for creating vault configurations based on different types
 */
export class VaultConfigurationFactory {
  /**
   * Creates a configuration for Bako type vaults
   */
  static createBakoConfiguration(
    params: BakoConfigurableType,
    version?: string,
  ): VaultConfiguration {
    const { SIGNATURES_COUNT, SIGNERS, HASH_PREDICATE } = params;
    const predicateLoader = loadPredicate(Wallet.FUEL, version);

    return {
      config: {
        SIGNATURES_COUNT,
        SIGNERS: makeSigners(SIGNERS),
        HASH_PREDICATE: HASH_PREDICATE ?? makeHashPredicate(),
      },
      predicateLoader,
      version: predicateLoader.version,
    };
  }

  /**
   * Creates a configuration for Connector type vaults
   */
  static createConnectorConfiguration(
    params: ConnectorConfigurableType,
    version?: string,
  ): VaultConfiguration {
    const walletType = walletOrigin(params.SIGNER);
    const predicateLoader = loadPredicate(walletType, version);

    return {
      config: {
        SIGNER: makeSigners(params.SIGNER),
      },
      predicateLoader,
      data: [] as [],
      version: predicateLoader.version,
    };
  }

  /**
   * Main factory method that determines the correct configuration type
   */
  static createConfiguration(
    params: VaultConfigurable,
    version?: string,
  ): VaultConfiguration {
    // Validate compatibility before creating configuration
    if (version) {
      CompatibilityService.isCompatibleWith(params, version);
    }

    if (isConnectorConfig(params)) {
      return this.createConnectorConfiguration(params, version);
    }

    return this.createBakoConfiguration(params, version);
  }

  /**
   * Creates configuration from BakoProvider authentication
   */
  static createFromProvider(
    provider: BakoProvider,
    version?: string,
  ): VaultConfiguration | null {
    if (!('cliAuth' in provider) || !provider.cliAuth) {
      return null;
    }

    return this.createConfiguration(
      provider.cliAuth.configurable,
      version ?? provider.cliAuth.version,
    );
  }
}
