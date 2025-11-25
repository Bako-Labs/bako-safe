import { Vault, ConfigVaultType, AddressUtils, Bech32Prefix } from 'bakosafe';
import { Address, Provider, ZeroBytes32 } from 'fuels';
import { launchTestNode } from 'fuels/test-utils';
import { accounts } from './mocks';
import { ethers } from 'ethers';
import { WebAuthn } from './utils/webauthn';

const EXAMPLE_PREDICATE_VERSIONS = {
  FUEL_EVM:
    '0xfdac03fc617c264fa6f325fd6f4d2a5470bf44cfbd33bc11efb3bf8b7ee2e938',
  BAKO: '0x0ec304f98efc18964de98c63be50d2360572a155b16bcb0f3718c685c70a00aa',
  BAKO_WITHOUT_EVM_SUP:
    '0x0ec304f98efc18964de98c63be50d2360572a155b16bcb0f3718c685c70a00aa',
};

describe('[Configurable Functions]', () => {
  let node: Awaited<ReturnType<typeof launchTestNode>>;
  let provider: Provider;
  const address = accounts['USER_1'].account;

  beforeAll(async () => {
    node = await launchTestNode();
    provider = node.provider;
  });

  afterAll(() => {
    node.cleanup();
  });

  describe('[GET_CONFIGURABLE]', () => {
    it('should return parsed BakoConfig for Bako vault', () => {
      const bakoConfig = {
        SIGNATURES_COUNT: 2,
        SIGNERS: [address, address],
        HASH_PREDICATE: address,
      };

      const vault = new Vault(provider, bakoConfig);
      const result = vault.getConfigurable();

      expect(result).toEqual({
        type: ConfigVaultType.BAKO,
        SIGNATURES_COUNT: 2,
        SIGNERS: [address, address, ...Array(8).fill(ZeroBytes32)],
        HASH_PREDICATE: address,
        version: vault.version,
      });
    });

    it('should return parsed ConnectorConfig for Connector EVM vault', () => {
      const evmWallet = ethers.Wallet.createRandom();
      const evmAddress = evmWallet.address;
      const connectorConfig = {
        SIGNER: evmAddress,
      };

      const vault = new Vault(provider, connectorConfig);
      const result = vault.getConfigurable();

      expect(result).toEqual({
        type: ConfigVaultType.CONNECTOR,
        SIGNER: new Address(evmAddress).toB256(),
        version: vault.version,
      });
    });

    it('should handle BakoConfig without HASH_PREDICATE', () => {
      const bakoConfig = {
        SIGNATURES_COUNT: 1,
        SIGNERS: [address],
      };

      const vault = new Vault(provider, bakoConfig);
      const result = vault.getConfigurable();

      expect(result).toEqual(
        expect.objectContaining({
          type: ConfigVaultType.BAKO,
          SIGNATURES_COUNT: 1,
          SIGNERS: [address, ...Array(9).fill(ZeroBytes32)],
          version: vault.version,
          HASH_PREDICATE: expect.any(String),
        }),
      );
    });
  });

  describe('[COMPATIBLE_CONFIGURABLE]', () => {
    it('should throw error for incompatible fuel wallet fuel_wallet:evm_connector_version', () => {
      const connectorConfig = {
        SIGNER: address,
      };

      expect(() => {
        new Vault(
          provider,
          connectorConfig,
          EXAMPLE_PREDICATE_VERSIONS.FUEL_EVM,
        );
      }).toThrow(
        `Predicate version "${EXAMPLE_PREDICATE_VERSIONS.FUEL_EVM}" is not compatible with wallet type "fuel".`,
      );
    });

    it('should throw error for incompatible BakoConfig bako_config:evm_version', () => {
      const bakoConfig = {
        SIGNATURES_COUNT: 1,
        SIGNERS: [address],
      };

      expect(() => {
        new Vault(provider, bakoConfig, EXAMPLE_PREDICATE_VERSIONS.FUEL_EVM);
      }).toThrow(
        `Predicate version "${EXAMPLE_PREDICATE_VERSIONS.FUEL_EVM}" is not compatible with wallet type "fuel".`,
      );
    });

    it('should throw error for incompatible BakoConfig version evm_walllet:older_bako_version (without sup evm wallets)', () => {
      const wallet = ethers.Wallet.createRandom();
      const evmAddress = wallet.address;
      const bakoConfig = {
        SIGNATURES_COUNT: 1,
        SIGNERS: [evmAddress],
      };

      expect(() => {
        new Vault(
          provider,
          bakoConfig,
          EXAMPLE_PREDICATE_VERSIONS.BAKO_WITHOUT_EVM_SUP,
        );
      }).toThrow(
        `Predicate version "${EXAMPLE_PREDICATE_VERSIONS.BAKO_WITHOUT_EVM_SUP}" is not compatible with wallet type "evm".`,
      );
    });

    it('should create vault for compatible version webauthn_wallet:evm_connector_version', () => {
      const webauthn_wallet = WebAuthn.createCredentials();
      const connectorConfig = {
        SIGNER: AddressUtils.toBech32(
          webauthn_wallet.address,
          Bech32Prefix.PASSKEY,
        ),
      };

      expect(() => {
        new Vault(
          provider,
          connectorConfig,
          EXAMPLE_PREDICATE_VERSIONS.FUEL_EVM,
        );
      }).toThrow(
        `Predicate version "${EXAMPLE_PREDICATE_VERSIONS.FUEL_EVM}" is not compatible with wallet type "webauthn".`,
      );
    });
  });

  // describe('VaultFactory.createVaultWithParsedConfig', () => {
  //   it('should create vault with parsed BakoConfig from string', () => {
  //     const bakoConfig = {
  //       SIGNATURES_COUNT: 2,
  //       SIGNERS: [address, address],
  //       HASH_PREDICATE: '0x1234567890abcdef',
  //     };

  //     const vault = VaultFactory.createVaultWithParsedConfig(
  //       provider,
  //       JSON.stringify(bakoConfig),
  //     );
  //     const config = vault.getConfigurable();

  //     expect(config).toEqual({
  //       type: ConfigVaultType.BAKO,
  //       ...bakoConfig,
  //     });
  //   });
  // });

  // describe('VaultFactory.createCompatibleVault', () => {
  //   it('should create compatible vault for BakoConfig', () => {
  //     const bakoConfig = {
  //       SIGNATURES_COUNT: 1,
  //       SIGNERS: [address],
  //     };

  //     // Find a Bako version
  //     const bakoVersion = Object.keys(versions).find(
  //       (v) => versions[v].walletOrigin === WalletType.BAKO,
  //     );

  //     expect(bakoVersion).toBeDefined();

  //     const vault = VaultFactory.createCompatibleVault(
  //       provider,
  //       bakoConfig,
  //       bakoVersion!,
  //     );

  //     expect(vault).toBeInstanceOf(Vault);
  //   });

  //   it('should throw error for incompatible configuration', () => {
  //     const bakoConfig = {
  //       SIGNATURES_COUNT: 1,
  //       SIGNERS: [address],
  //     };

  //     // Find an EVM version (incompatible with Bako config)
  //     const evmVersion = Object.keys(versions).find(
  //       (v) => versions[v].walletOrigin === WalletType.EVM,
  //     );

  //     expect(evmVersion).toBeDefined();

  //     expect(() => {
  //       VaultFactory.createCompatibleVault(provider, bakoConfig, evmVersion!);
  //     }).toThrow();
  //   });
  // });

  // describe('VaultFactory.isConfigurationCompatible', () => {
  //   it('should return true for compatible configuration', () => {
  //     const bakoConfig = {
  //       SIGNATURES_COUNT: 1,
  //       SIGNERS: [address],
  //     };

  //     // Find a Bako version
  //     const bakoVersion = Object.keys(versions).find(
  //       (v) => versions[v].walletOrigin === WalletType.BAKO,
  //     );

  //     expect(bakoVersion).toBeDefined();

  //     const result = VaultFactory.isConfigurationCompatible(
  //       bakoConfig,
  //       bakoVersion!,
  //     );

  //     expect(result).toBe(true);
  //   });

  //   it('should return false for incompatible configuration', () => {
  //     const bakoConfig = {
  //       SIGNATURES_COUNT: 1,
  //       SIGNERS: [address],
  //     };

  //     // Find an EVM version (incompatible with Bako config)
  //     const evmVersion = Object.keys(versions).find(
  //       (v) => versions[v].walletOrigin === WalletType.EVM,
  //     );

  //     expect(evmVersion).toBeDefined();

  //     const result = VaultFactory.isConfigurationCompatible(
  //       bakoConfig,
  //       evmVersion!,
  //     );

  //     expect(result).toBe(false);
  //   });
  // });

  // describe('VaultFactory.parseConfiguration', () => {
  //   it('should parse BakoConfig from object', () => {
  //     const bakoConfig = {
  //       SIGNATURES_COUNT: 2,
  //       SIGNERS: [address, address],
  //       HASH_PREDICATE: '0xabcdef1234567890',
  //     };

  //     const result = VaultFactory.parseConfiguration(bakoConfig);

  //     expect(result).toEqual({
  //       type: ConfigVaultType.BAKO,
  //       SIGNATURES_COUNT: 2,
  //       SIGNERS: [address, address],
  //       HASH_PREDICATE: '0xabcdef1234567890',
  //     });
  //   });

  //   it('should parse configuration from string', () => {
  //     const evmAddress = '0x742d35Cc6335C0532FDD5d9dA5Ac5Cd6C3f776a';
  //     const connectorConfig = {
  //       SIGNER: evmAddress,
  //     };

  //     const result = VaultFactory.parseConfiguration(
  //       JSON.stringify(connectorConfig),
  //     );

  //     expect(result).toEqual({
  //       type: ConfigVaultType.CONNECTOR,
  //       SIGNER: evmAddress,
  //     });
  //   });
  // });
});
