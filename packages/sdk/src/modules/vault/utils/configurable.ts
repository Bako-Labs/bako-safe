import {
  VaultConfigurable,
  BakoConfigurableType,
  ConnectorConfigurableType,
  VaultConfig,
  ConnectorConfig,
  ConfigVaultType,
} from '../types';

import { AddressUtils } from '../../address';
import { getAllVersionsDetails } from '../../../sway';
import { Address } from 'fuels';

// Type guards para os tipos originais (sem enum)
export function isBakoConfig(
  config: VaultConfigurable,
): config is BakoConfigurableType {
  return (
    'SIGNATURES_COUNT' in config ||
    'SIGNERS' in config ||
    Array.isArray((config as any).SIGNERS)
  );
}

export function isConnectorConfig(
  config: VaultConfigurable,
): config is ConnectorConfigurableType {
  return 'SIGNER' in config && typeof config.SIGNER === 'string';
}

export function parseConfig(config: VaultConfigurable | string): VaultConfig {
  const _config = typeof config === 'string' ? JSON.parse(config) : config;

  if (isBakoConfig(_config)) {
    // Validação para configuração BAKO
    if (_config.SIGNERS && Array.isArray(_config.SIGNERS)) {
      for (const signer of _config.SIGNERS) {
        if (!isValidWalletAddress(signer)) {
          throw new Error(`Invalid wallet address in SIGNERS: ${signer}`);
        }
      }
    }

    return {
      type: ConfigVaultType.BAKO,
      ..._config,
    };
  }

  // Validação para configuração CONNECTOR
  if (_config.SIGNER && !isValidWalletAddress(_config.SIGNER)) {
    throw new Error(`Invalid wallet address in SIGNER: ${_config.SIGNER}`);
  }

  return {
    type: ConfigVaultType.CONNECTOR,
    ..._config,
  };
}

// Função helper para criar ConnectorConfig
export function createConnectorConfig(
  config: ConnectorConfigurableType,
): ConnectorConfig {
  // Validação do endereço SIGNER
  if (config.SIGNER && !isValidWalletAddress(config.SIGNER)) {
    throw new Error(`Invalid wallet address in SIGNER: ${config.SIGNER}`);
  }

  return {
    type: ConfigVaultType.CONNECTOR,
    ...config,
  };
}

// is equal wallet origin of versions predicate file
export enum Wallet {
  EVM = 'evm',
  SVM = 'svm',
  FUEL = 'fuel',
  WEBAUTHN = 'webauthn',
}

// Validação de endereços Fuel
export const isValidFuelAddress = (address: string): boolean => {
  try {
    // Verifica se é um endereço Fuel válido (b256)
    if (address.startsWith('0x') && address.length === 66) {
      // Tenta criar um Address do Fuel
      const fuelAddress = new Address(address);
      return fuelAddress.toB256() === address;
    }
    return false;
  } catch {
    return false;
  }
};

// Validação de endereços SVM (Solana)
export const isValidSvmAddress = (address: string): boolean => {
  try {
    // Endereços Solana são base58 e têm 32-44 caracteres
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return base58Regex.test(address);
  } catch {
    return false;
  }
};

// Validação de endereços WebAuthn (passkey)
export const isValidWebAuthnAddress = (address: string): boolean => {
  return AddressUtils.isPasskey(address);
};

// Validação geral de endereço
export const isValidWalletAddress = (address: string): boolean => {
  return (
    AddressUtils.isEvm(address) ||
    isValidFuelAddress(address) ||
    isValidSvmAddress(address) ||
    isValidWebAuthnAddress(address)
  );
};

export const walletOrigin = (address: string): Wallet => {
  if (AddressUtils.isEvm(address)) {
    return Wallet.EVM;
  }

  if (isValidSvmAddress(address)) {
    return Wallet.SVM;
  }

  if (isValidWebAuthnAddress(address)) {
    return Wallet.WEBAUTHN;
  }

  // Endereços Fuel são o tipo padrão
  return Wallet.FUEL;
};
