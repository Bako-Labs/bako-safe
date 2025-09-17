library;

use std::{
    b512::B512,
    bytes::Bytes,
    crypto::{
        message::Message,
        public_key::PublicKey,
        secp256k1::Secp256k1,
        secp256r1::Secp256r1,
        signature::Signature,
    },
    ecr::{
        ec_recover_address,
        ec_recover_address_r1,
    },
    hash::*,
    result::Result,
    tx::{
        GTF_WITNESS_DATA,
        tx_witness_data,
    },
    vm::evm::{
        evm_address::EvmAddress,
    },
};
use ::utilities::{b256_to_ascii_bytes, hash_tx_id, personal_sign_hash};
use ::entities::{SignatureAddress, WebAuthnHeader};
use ::webauthn_digest::get_webauthn_digest;
use ::constants::INVALID_ADDRESS;

/// Verify a signature using the FUEL curve [Secp256k1]
///     - params:
///         - signature: the signature to verify
///         - tx_hash: the hash of the transaction
///     - returns: the address of the signer
pub fn fuel_verify(signature: B512, tx_bytes: Bytes) -> SignatureAddress {
    let tx_fuel = hash_tx_id(tx_bytes);
    let message = Message::from(tx_fuel);
    let signature = Signature::Secp256k1(Secp256k1::from(signature));
    let address = signature.address(message).unwrap_or(INVALID_ADDRESS);
    SignatureAddress::FUEL(address)
}

/// Verify a signature using the secp256r1 curve [Secp256r1]
///     - params:
///         - signature: the signature to verify
///         - digest: the digest of the message
///     - returns: the address of the signer
pub fn webauthn_verify(digest: b256, webauthn: WebAuthnHeader) -> SignatureAddress {
    let message = Message::from(digest);
    let signature = Signature::Secp256r1(Secp256r1::from(webauthn.signature));
    let address = signature.address(message).unwrap_or(INVALID_ADDRESS);
    SignatureAddress::FUEL(address)
}

pub fn evm_verify(witnesses_data: B512, tx_bytes: b256) -> SignatureAddress {
    let signature = Signature::Secp256k1(Secp256k1::from(witnesses_data));
    let message = Message::from(personal_sign_hash(tx_bytes));

    match signature.evm_address(message) {
        Ok(evm_address) => {
            SignatureAddress::EVM(evm_address)
        },
        Err(_) => {
            SignatureAddress::FUEL(INVALID_ADDRESS)
        }
    }
}
