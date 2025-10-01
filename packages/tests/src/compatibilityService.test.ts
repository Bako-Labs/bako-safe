import { VaultConfig, Version, Wallet } from 'bakosafe';
import { ZeroBytes32 } from 'fuels';
import { CompatibilityService } from '../../sdk/src/modules/vault/services/CompatibilityService';
import { ConfigVaultType } from '../../sdk/src/modules/vault/types';
import { parseConfig } from '../../sdk/src/modules/vault/utils';
import {
  Wallet as WalletEnum,
  walletOrigin,
} from '../../sdk/src/modules/vault/utils/configurable';

jest.mock('../../sdk/src/modules/vault/utils', () => ({
  parseConfig: jest.fn(),
}));

jest.mock('../../sdk/src/modules/vault/utils/configurable', () => ({
  walletOrigin: jest.fn(),
  Wallet,
}));

jest.mock('../../sdk/src/sway', () => ({
  getAllVersionsDetails: jest.fn(),
}));

const mockParseConfig = parseConfig as jest.MockedFunction<typeof parseConfig>;
const mockWalletOrigin = walletOrigin as jest.MockedFunction<
  typeof walletOrigin
>;
const mockGetAllVersionsDetails = jest.requireMock('../../sdk/src/sway')
  .getAllVersionsDetails as jest.MockedFunction<
  () => Record<string, Partial<Version>>
>;

const walletFuel = WalletEnum.FUEL;
const walletEvm = WalletEnum.EVM;

describe('CompatibilityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isCompatibleWith', () => {
    it('should require a configuration', () => {
      expect(() =>
        CompatibilityService.isCompatibleWith(undefined as any, 'v1'),
      ).toThrow('Configuration is required');
    });

    it('should require a valid version string', () => {
      expect(() =>
        CompatibilityService.isCompatibleWith({} as any, ''),
      ).toThrow('Version must be a non-empty string');
    });

    it('should validate BAKO configurations against compatible versions', () => {
      const version = 'bako-v1';
      const signer = '0xabc';

      mockParseConfig.mockReturnValue({
        type: ConfigVaultType.BAKO,
        SIGNERS: [signer, ZeroBytes32],
        SIGNATURES_COUNT: 1,
      } satisfies VaultConfig);

      mockGetAllVersionsDetails.mockReturnValue({
        [version]: { walletOrigin: ['fuel', 'evm'] },
      });

      mockWalletOrigin.mockReturnValue(walletFuel);

      const result = CompatibilityService.isCompatibleWith('config', version);

      expect(result).toBe(true);
      expect(mockParseConfig).toHaveBeenCalledWith('config');
      expect(mockWalletOrigin).not.toHaveBeenCalledWith(ZeroBytes32);
      expect(mockWalletOrigin).toHaveBeenCalledTimes(1);
    });

    it('should validate CONNECTOR configurations against compatible versions', () => {
      const version = 'connector-v1';
      const signer = '0x123';

      mockParseConfig.mockReturnValue({
        type: ConfigVaultType.CONNECTOR,
        SIGNER: signer,
      } satisfies VaultConfig);

      mockGetAllVersionsDetails.mockReturnValue({
        [version]: { walletOrigin: ['evm'] },
      });

      mockWalletOrigin.mockReturnValue(walletEvm);

      const result = CompatibilityService.isCompatibleWith('config', version);

      expect(result).toBe(true);
      expect(mockWalletOrigin).toHaveBeenCalledWith(signer);
    });

    it('should throw when predicate version is not found and report wallet type', () => {
      const version = 'missing-version';
      const signer = '0xdead';

      mockParseConfig.mockReturnValue({
        type: ConfigVaultType.BAKO,
        SIGNERS: [signer],
        SIGNATURES_COUNT: 1,
      } satisfies VaultConfig);

      mockGetAllVersionsDetails.mockReturnValue({});
      mockWalletOrigin.mockReturnValue(walletFuel);

      expect(() =>
        CompatibilityService.isCompatibleWith('config', version),
      ).toThrow(
        `Predicate version "${version}" not found for wallet type "fuel".`,
      );
    });

    it('should throw when BAKO signer wallet type is incompatible with version', () => {
      const version = 'bako-v2';
      const signer = '0xdef';

      mockParseConfig.mockReturnValue({
        type: ConfigVaultType.BAKO,
        SIGNERS: [signer],
        SIGNATURES_COUNT: 1,
      } satisfies VaultConfig);

      mockGetAllVersionsDetails.mockReturnValue({
        [version]: { walletOrigin: ['evm'] },
      });

      mockWalletOrigin.mockReturnValue(walletFuel);

      expect(() =>
        CompatibilityService.isCompatibleWith('config', version),
      ).toThrow(
        `Predicate version "${version}" is not compatible with wallet type "fuel".`,
      );
    });

    it('should throw when CONNECTOR signer wallet type is incompatible with version', () => {
      const version = 'connector-v2';
      const signer = '0xbeef';

      mockParseConfig.mockReturnValue({
        type: ConfigVaultType.CONNECTOR,
        SIGNER: signer,
      } satisfies VaultConfig);

      mockGetAllVersionsDetails.mockReturnValue({
        [version]: { walletOrigin: ['fuel'] },
      });

      mockWalletOrigin.mockReturnValue(walletEvm);

      expect(() =>
        CompatibilityService.isCompatibleWith('config', version),
      ).toThrow(
        `Predicate version "${version}" is not compatible with wallet type "evm".`,
      );
    });

    it('should throw for unknown configuration types', () => {
      const version = 'any';

      mockParseConfig.mockReturnValue({
        type: 'UNKNOWN',
      } as any);

      mockGetAllVersionsDetails.mockReturnValue({
        [version]: { walletOrigin: ['fuel'] },
      });

      expect(() =>
        CompatibilityService.isCompatibleWith('config', version),
      ).toThrow('Unknown configuration type: UNKNOWN');
    });

    it('should wrap JSON parsing errors with descriptive message', () => {
      const version = 'any';

      mockParseConfig.mockImplementation(() => {
        throw new Error('Unexpected token in JSON');
      });

      expect(() =>
        CompatibilityService.isCompatibleWith('config', version),
      ).toThrow('Invalid configuration format: Unexpected token in JSON');
    });
  });

  describe('isCompatibleSafe', () => {
    it('should return false when compatibility validation throws', () => {
      const version = 'missing';

      mockParseConfig.mockReturnValue({
        type: ConfigVaultType.CONNECTOR,
        SIGNER: '0xabc',
      } satisfies VaultConfig);

      mockGetAllVersionsDetails.mockReturnValue({});
      mockWalletOrigin.mockReturnValue(walletFuel);

      const result = CompatibilityService.isCompatibleSafe('config', version);

      expect(result).toBe(false);
    });

    it('should return true when compatibility validation succeeds', () => {
      const version = 'version';

      mockParseConfig.mockReturnValue({
        type: ConfigVaultType.CONNECTOR,
        SIGNER: '0x123',
      } satisfies VaultConfig);

      mockGetAllVersionsDetails.mockReturnValue({
        [version]: { walletOrigin: ['fuel', 'evm'] },
      });

      mockWalletOrigin.mockReturnValue(walletEvm);

      const result = CompatibilityService.isCompatibleSafe('config', version);

      expect(result).toBe(true);
    });
  });
});
