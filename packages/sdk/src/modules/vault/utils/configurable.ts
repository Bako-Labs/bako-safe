import {
  VaultConfigurable,
  BakoConfigurableType,
  ConnectorConfigurableType,
} from 'src/modules';

import { AddressUtils } from '../../address';

export function isBakoConfig(
  config: VaultConfigurable,
): config is BakoConfigurableType {
  return (
    'SIGNERS_COUNT' in config ||
    'SIGNERS' in config ||
    Array.isArray((config as any).SIGNERS)
  );
}

export function isConnectorConfig(
  config: VaultConfigurable,
): config is ConnectorConfigurableType {
  return 'SIGNER' in config && typeof config.SIGNER === 'string';
}

// is equal wallet origin of versions predicate file
export enum Wallet {
  EVM = 'evm',
  SVM = 'svm',
  FUEL = 'fuel', // can by fuel or webauthn
  BAKO = 'bako',
}

export const walletOrigin = (address: string): Wallet => {
  if (AddressUtils.isEvm(address)) {
    return Wallet.EVM;
  }
  //   else if (isSvmWallet(address)) {
  //     return Wallet.SVM;
  //   }

  return Wallet.FUEL;
};
