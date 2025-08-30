import { Provider } from 'fuels';
import { VaultFactory } from './VaultFactory';
import { BakoConfigurableType, ConnectorConfigurableType } from '../types';

// Mock dependencies
jest.mock('../../../sway', () => ({
  loadPredicate: jest.fn(() => ({
    abi: {},
    bytecode: '0x123',
    version: 'test-version',
  })),
}));

jest.mock('../../../utils', () => ({
  makeSigners: jest.fn((signers) => signers),
  makeHashPredicate: jest.fn(() => 'test-hash'),
}));

jest.mock('../../../utils/vault/configurable', () => ({
  isConnectorConfig: jest.fn((config) => 'SIGNER' in config),
  walletOrigin: jest.fn(() => 'fuel'),
  Wallet: { BAKO: 'bako', FUEL: 'fuel' },
}));

describe('VaultFactory', () => {
  let mockProvider: Provider;

  beforeEach(() => {
    mockProvider = {
      getChainId: jest.fn(),
    } as any;
  });

  describe('createBakoVault', () => {
    it('should create a Bako vault with correct configuration', () => {
      const config: BakoConfigurableType = {
        SIGNATURES_COUNT: 2,
        SIGNERS: ['0x123', '0x456'],
        HASH_PREDICATE: 'test-hash',
      };

      const vault = VaultFactory.createBakoVault(mockProvider, config);

      expect(vault).toBeDefined();
      expect(vault.predicateVersion).toBe('test-version');
    });
  });

  describe('createConnectorVault', () => {
    it('should create a Connector vault with correct configuration', () => {
      const config: ConnectorConfigurableType = {
        SIGNER: '0x123',
      };

      const vault = VaultFactory.createConnectorVault(mockProvider, config);

      expect(vault).toBeDefined();
      expect(vault.predicateVersion).toBe('test-version');
    });
  });

  describe('createVault', () => {
    it('should create vault with auto-detection for Bako type', () => {
      const config: BakoConfigurableType = {
        SIGNATURES_COUNT: 1,
        SIGNERS: ['0x123'],
      };

      const vault = VaultFactory.createVault(mockProvider, config);

      expect(vault).toBeDefined();
    });

    it('should create vault with auto-detection for Connector type', () => {
      const config: ConnectorConfigurableType = {
        SIGNER: '0x123',
      };

      const vault = VaultFactory.createVault(mockProvider, config);

      expect(vault).toBeDefined();
    });
  });
});
