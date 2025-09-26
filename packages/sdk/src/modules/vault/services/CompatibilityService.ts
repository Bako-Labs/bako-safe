import { ZeroBytes32 } from 'fuels';
import { ConfigVaultType, VaultConfigurable } from '../types';
import { parseConfig } from '../utils';
import { walletOrigin } from '../utils/configurable';

/**
 * Service responsible for vault configuration compatibility validation
 */
export class CompatibilityService {
  /**
   * Checks if a configuration is compatible with a specific version.
   *
   * @param config - The vault configuration to validate
   * @param version - The predicate version to check compatibility with
   * @returns True if the configuration is compatible with the version
   * @throws Error if the version is not found or configuration is invalid
   */
  static isCompatibleWith(
    config: VaultConfigurable | string,
    version: string,
  ): boolean {
    // Validate inputs
    if (!config) {
      throw new Error('Configuration is required');
    }

    if (!version || typeof version !== 'string') {
      throw new Error('Version must be a non-empty string');
    }

    try {
      const parsedConfig = parseConfig(config);
      const { getAllVersionsDetails } = require('../../../sway');
      const { Wallet } = require('../utils/configurable');
      const versions = getAllVersionsDetails();

      // Check if version exists
      if (!versions[version]) {
        // Determine wallet type for better error message
        let walletType = 'unknown';
        if (parsedConfig.type === ConfigVaultType.BAKO) {
          const bakoConfig = parsedConfig as any;
          if (
            bakoConfig.SIGNERS &&
            Array.isArray(bakoConfig.SIGNERS) &&
            bakoConfig.SIGNERS.length > 0
          ) {
            walletType = walletOrigin(bakoConfig.SIGNERS[0]);
          }
        } else if (parsedConfig.type === ConfigVaultType.CONNECTOR) {
          const connectorConfig = parsedConfig as any;
          if (connectorConfig.SIGNER) {
            walletType = walletOrigin(connectorConfig.SIGNER);
          }
        }
        throw new Error(
          `Predicate version "${version}" not found for wallet type "${walletType}".`,
        );
      }

      const versionDetails = versions[version];

      if (parsedConfig.type === ConfigVaultType.BAKO) {
        // Para configuração BAKO, verificar se todos os endereços são compatíveis
        const bakoConfig = parsedConfig as any; // Type assertion for BAKO config
        if (bakoConfig.SIGNERS && Array.isArray(bakoConfig.SIGNERS)) {
          for (const signer of bakoConfig.SIGNERS.filter(
            (s: string) => s != ZeroBytes32,
          )) {
            const walletType = walletOrigin(signer);
            if (!versionDetails.walletOrigin.includes(walletType)) {
              throw new Error(
                `Predicate version "${version}" is not compatible with wallet type "${walletType}".`,
              );
            }
          }
        }
        return true;
      }

      if (parsedConfig.type === ConfigVaultType.CONNECTOR) {
        // Para configuração CONNECTOR, verificar se o endereço é compatível
        const connectorConfig = parsedConfig as any; // Type assertion for CONNECTOR config
        if (connectorConfig.SIGNER) {
          const walletType = walletOrigin(connectorConfig.SIGNER);
          if (!versionDetails.walletOrigin.includes(walletType)) {
            throw new Error(
              `Predicate version "${version}" is not compatible with wallet type "${walletType}".`,
            );
          }
        }
        return true;
      }

      // Unknown configuration type
      throw new Error(
        `Unknown configuration type: ${(parsedConfig as any).type}`,
      );
    } catch (error) {
      // Re-throw parsing errors with more context
      if (error instanceof Error && error.message.includes('JSON')) {
        throw new Error(`Invalid configuration format: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Safely checks if a configuration is compatible with a specific version.
   * Returns false instead of throwing errors.
   *
   * @param config - The vault configuration to validate
   * @param version - The predicate version to check compatibility with
   * @returns True if compatible, false otherwise
   */
  static isCompatibleSafe(
    config: VaultConfigurable | string,
    version: string,
  ): boolean {
    try {
      return this.isCompatibleWith(config, version);
    } catch {
      return false;
    }
  }
}
