# BAKO SAFE

This repo is part of [Bako ecossistem](https://www.bako.global/)

### Fuel Shared Wallet

A streamlined solution within the Fuel ecosystem, enabling seamless implementation and effortless coin transfers in a collaborative wallet environment.
On this repo, we have:

#### 📦 Bako Safe SDK : [This](https://github.com/Bako-Labs/bako-safe/blob/main/packages/sdk/README.md) package have all implementations of vaults, transactions and auth.

#### 📑 Bako Safe Contracts: [This](https://github.com/Bako-Labs/bako-safe/blob/main/packages/sway/README.md) package have the contract used by sdk to implement a multsig based on predicates.

## Requirements

- fuel-core@0.35.0
- forc@0.63.5

## Tests

1. Install [Fuel Toolchain](https://docs.fuel.network/guides/installation/)
2. Install dependencies with pnpm: `pnpm install`
3. Build packages: `pnpm -w build`
4. `cd packages/tests`
5. Run the tests: `pnpm test`

## Run debbug mode:

1. Install [Fuel Toolchain](https://docs.fuel.network/guides/installation/)
2. Install dependencies with pnpm: `pnpm install`
3. `cd packages/tests`
4. Copy predicate to script debbug file `pnpm debbug:setup`
5. Add changes and build from script `pnpm debbug:build`
6. Run your changed script `pnpm debbug:script`
