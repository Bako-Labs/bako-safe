# WebAuthn Module

The `webauthn` module provides Web Authentication (WebAuthn) functionality for Bako Safe, enabling secure, passwordless authentication using public-key cryptography and hardware authenticators.

## Architecture

```
webauthn/
├── services/                    # Core WebAuthn functionality
│   ├── WebAuthnService.ts      # Main service functions
│   └── index.ts
├── utils/                       # Utility functions
│   ├── bytes.ts                # Byte manipulation utilities
│   ├── crypto.ts               # Cryptographic operations
│   ├── EIP2090.ts              # EIP-2090 signature encoding
│   └── index.ts
├── index.ts                     # Main exports
└── README.md                    # This file
```

## Core Features

### Account Creation

The module provides functionality to create new WebAuthn accounts with credential generation.

### Challenge Signing

Challenge signing capabilities using existing WebAuthn credentials.

### Response Parsing

Parsing and validation of WebAuthn authentication responses.

## Utility Functions

### Byte Manipulation

Utilities for converting between different byte representations and finding byte sequences.

### Cryptographic Operations

SHA-256 hashing, public key parsing, and signature processing with recovery bit calculation.

### EIP-2090 Support

Encoding and decoding of signatures with embedded recovery bits.

## WebAuthn Flow

### 1. Registration (Account Creation)

The process involves generating challenges, creating credentials, and storing credential information.

### 2. Authentication (Challenge Signing)

Authentication involves generating new challenges, requesting signatures, and verifying responses.

## Security Considerations

- **Challenge Randomness**: Always use cryptographically secure random challenges
- **Origin Validation**: Verify that authentication requests come from expected origins
- **Credential Storage**: Securely store credential IDs and public keys
- **Signature Verification**: Always verify signatures before accepting authentication
- **Hardware Requirements**: Ensure hardware authenticators meet security requirements

## Browser Compatibility

This module requires browsers that support the WebAuthn API:

- Chrome 67+
- Firefox 60+
- Safari 13+
- Edge 18+

## Testing

For testing purposes, the module includes mock implementations for development and testing scenarios.

## Integration with Bako Safe

The WebAuthn module integrates seamlessly with Bako Safe's signature encoding system for automatic signature detection and encoding.
