# Coders Module

The `coders` module provides encoding services for Bako Safe signatures and transaction IDs, supporting multiple wallet types and predicate versions.

## Architecture

```
coders/
├── Coder.ts                       # Main encoding class
├── types.ts                       # Type definitions
├── factory/                       # Factory pattern implementations
│   ├── CoderFactory.ts           # Creates configured instances
│   └── index.ts
├── services/                      # Encoding services
│   ├── SignatureService.ts       # Signature encoding logic
│   ├── EncodingService.ts        # Transaction ID encoding
│   └── index.ts
├── index.ts                       # Main exports
└── README.md                      # This file
```

## Usage

### Signature Encoding

The module provides automatic signature type detection and encoding functionality.

### Transaction ID Encoding

Transaction ID encoding based on predicate version.

### Custom Coders

Factory classes for creating configured coders with different capabilities.

## Supported Signature Types

- **WebAuthn**: Web Authentication API signatures
- **Fuel**: Native Fuel wallet signatures
- **EVM**: Ethereum-compatible wallet signatures
- **RawNoPrefix**: Raw signatures without BAKO prefix

## Backward Compatibility

The module maintains backward compatibility with the previous API through deprecated exports.

## Migration Guide

The module provides migration paths from old API to new factory-based patterns.
