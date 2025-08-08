import {
  VaultConfigurable,
  BakoConfigurableType,
  ConnectorConfigurableType,
} from 'src/modules';

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

export function isEvmWallet(address: string) {
  const EVM_ADDRESS_LEN = 42;

  return address.length === EVM_ADDRESS_LEN && address.startsWith('0x');
}

export enum Wallet {
  EVM = 'evm',
  SVM = 'svm',
  FUEL = 'fuel',
  BAKO = 'bako',
}

export const walletOrigin = (address: string): Wallet => {
  if (isEvmWallet(address)) {
    return Wallet.EVM;
  }
  //   else if (isSvmWallet(address)) {
  //     return Wallet.SVM;
  //   }

  return Wallet.FUEL;
};
