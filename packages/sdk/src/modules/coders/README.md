# Coders Module

The `coders` module provides encoding services for Bako Safe signatures and transaction IDs, supporting multiple wallet types and predicate versions.

## Architecture

```
coders/
├── core/                    # Core classes and types
│   ├── BakoCoder.ts        # Main encoding class
│   ├── SignatureTypes.ts   # Signature type definitions
│   └── index.ts
├── services/               # Encoding services
│   ├── SignatureEncoder.ts # Signature encoding logic
│   ├── TxIdEncoder.ts      # Transaction ID encoding
│   └── index.ts
├── factories/              # Factory pattern implementations
│   ├── CoderFactory.ts     # Creates configured instances
│   └── index.ts
├── types.ts               # Type re-exports
├── index.ts               # Main exports
└── README.md              # This file
```

## Usage

### Signature Encoding

```typescript
import { SignatureEncoder } from './coders';

// Automatic signature type detection and encoding
const encoded = SignatureEncoder.encode(
  walletAddress,
  signature,
  predicateVersion,
);
```

### Transaction ID Encoding

```typescript
import { TxIdEncoder } from './coders';

// Encode transaction ID based on predicate version
const encoded = TxIdEncoder.encode(txId, predicateVersion);

// Check if version requires byte encoding
if (TxIdEncoder.requiresByteEncoding(version)) {
  // Handle Uint8Array format
}
```

### Custom Coders

```typescript
import { CoderFactory } from './coders';

// Create a fully configured coder
const fullCoder = CoderFactory.createBakoCoder();

// Create a minimal coder (Fuel + EVM only)
const minimalCoder = CoderFactory.createMinimalCoder();
```

## Supported Signature Types

- **WebAuthn**: Web Authentication API signatures
- **Fuel**: Native Fuel wallet signatures
- **EVM**: Ethereum-compatible wallet signatures
- **RawNoPrefix**: Raw signatures without BAKO prefix

## Backward Compatibility

The module maintains backward compatibility with the previous API:

```typescript
// Deprecated but still supported
import { bakoCoder, encodeSignature } from './coders';
```

## Migration Guide

### From Old API:

```typescript
import { bakoCoder, encodeSignature } from './coders';
```

### To New API:

```typescript
import { CoderFactory, SignatureEncoder } from './coders';

const bakoCoder = CoderFactory.createBakoCoder();
const encoded = SignatureEncoder.encode(address, sig, version);
```

