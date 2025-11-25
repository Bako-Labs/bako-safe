# Address Module

The `address` module provides utility functions for address conversion and validation in Bako Safe, specifically handling conversions between Fuel and Ethereum address formats, as well as Bech32 encoding/decoding for passkey addresses.

## Architecture

```
address/
├── Address.ts                     # Address utility functions
├── types.ts                       # Address type definitions
├── index.ts                       # Module exports
└── README.md                      # This file
```

## Core Components

### AddressUtils Class

A static utility class that provides methods for address conversion and validation.

### Address Types

The module defines types for Bech32 encoding and passkey addresses.

## Available Methods

### hex2string(add: string[])

Converts an array of hex addresses to string representation, filtering out ZeroBytes32 addresses.

### isPasskey(value: string): boolean

Checks if an address is a passkey address by verifying if it starts with the passkey prefix.

### isSocial(value: string): boolean

Checks if an address is a social address by verifying if it starts with the social prefix.

### toBech32(address: string, prefix: Bech32Prefix): Bech32

Converts a hex address to Bech32 prefix format.

### toPasskey(address: string): Bech32

**@deprecated** Use `toBech32` instead.

Converts a hex address to Bech32 passkey format.

### fromBech32(address: Bech32): string

Converts a Bech32 address back to hex format.

### isEvm(address: string): boolean

Checks if an address is a valid EVM address. Automatically converts Fuel addresses to Ethereum format before validation.

### parseFuelAddressToEth(address: string): string

Converts a Fuel address to Ethereum format by truncating to 20 bytes.
