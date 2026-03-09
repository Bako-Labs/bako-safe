# 📑 Bako Safe Contracts

## Multi-Signature Smart Contract Package for Fuel Ecosystem

This package is designed to operate within the Fuel ecosystem, ensuring compatibility with beta5. It utilizes a predicate contract type to construct a multi-signature mechanism. This mechanism allows for pre-configuring the individuals required to witness a transaction, along with specifying the minimum number of witnesses needed for transaction confirmation.

To integrate this multi-signature smart contract into your project, ensure you're operating within the Fuel ecosystem and your environment is compatible with beta5. For detailed instructions on setting up and using the supported wallets, please refer to their respective links provided.

## Supported Signatures

Our predicate contract supports multiple types of signatures for maximum flexibility:

1. **Fuel Ecosystem Native Wallets**: Signatures from the native wallets within the Fuel ecosystem are accepted. This includes:

   - [FuelWallet](https://chromewebstore.google.com/detail/fuel-wallet/dldjpboieedgcmpkchcjcbijingjcgok): A native wallet designed for seamless integration with Fuel's functionalities.
   - [Fuelet](https://chromewebstore.google.com/detail/fuelet-wallet-fuel/bifidjkcdpgfnlbcjpdkdcnbiooooblg): Another native wallet option for users within the Fuel ecosystem.

2. **WebAuthn Signatures**: We support signatures made through WebAuthn, providing a secure and widely compatible method for authentication. This enables biometric and hardware security key authentication.

   - Learn more: [WebAuthn Specification](https://webauthn.io/)

3. **EVM Signatures (Ethereum)**: We support Ethereum-compatible signatures (ECDSA), enabling interoperability with Ethereum wallets and signing mechanisms.

   - Compatible with: MetaMask, Hardware wallets, EVM-based signers

---

## 📖 Complete Guide

For a comprehensive step-by-step guide on generating and publishing new predicate versions, please refer to the [Predicate Version Guide](../../docs/predicate-version/README.md).

**Available Languages:**

- [English](../../docs/predicate-version/README.en.md)
- [Português (Brasil)](../../docs/predicate-version/README.md)
