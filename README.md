# Bako Safe SDK

The Bako Safe SDK manages all the logic of the Bako Safe multisig wallet, including:

- **Blockchain Network Integration:** Simplifying interactions with blockchain networks and managing network providers.
- **Authentication and Security:** Implementing secure authentication methods and security protocols.
- **Vault Creation and Management:** Setting up and configuring secure vaults for crypto assets.
- **Signer Registration and Management:** Adding and removing signers, and managing their signatures for transaction authorization.
- **Transaction Management:** Initiating, signing, approving, and executing transactions.
- **Utility and Helper Functions:** Providing error handling and SDK customization options.

Within the packages folder, you will find the following subdirectories:

- **[sway:](https://github.com/Bako-Labs/bako-safe/tree/main/packages/sdk)** Contains the predicates and libraries (e.g., webauthn).
- **[sdk:](https://github.com/Bako-Labs/bako-safe/tree/main/packages/sdk)** Our TypeScript SDK that interacts with Bako.

For for information, check out the [Documentation page](https://doc-safe.bako.global/).

## Requirements

- fuel-core@0.38.0
- forc@0.65.2
- fuels-ts@0.96.1

## Tests

1. Install [Fuel Toolchain](https://docs.fuel.network/guides/installation/)
2. Install dependencies with pnpm: `pnpm install`
3. Build packages: `pnpm -w build`
4. `cd packages/tests`
5. Run the tests: `pnpm test`
6. Or run only test file `pnpm test:file ${filename}`

## Run debug mode:

1. Install [Fuel Toolchain](https://docs.fuel.network/guides/installation/)
2. Install dependencies with pnpm: `pnpm install`
3. `cd packages/tests`
4. Copy predicate to script debbug file `pnpm debbug:setup`
5. Add changes and build from script `pnpm debbug:build`
6. Run your changed script `pnpm debbug:script`
