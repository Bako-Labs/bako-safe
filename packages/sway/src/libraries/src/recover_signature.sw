library;

use std::{
  b512::B512,
  hash::*,
  bytes::Bytes,
  result::Result,
  ecr::{
    ec_recover_address, 
    ec_recover_address_r1
  },
  tx::{
    GTF_WITNESS_DATA,
    tx_witness_data,
  }
};
use ::entities::{
  WebAuthn,
};
use ::webauthn_digest::{
  get_webauthn_digest,
};
use ::constants::{
  INVALID_ADDRESS,
};


/// Verify a signature using the FUEL curve [Secp256k1]

///     - params: 
///         - signature: the signature to verify
///         - tx_hash: the hash of the transaction

///     - returns: the address of the signer
pub fn fuel_verify(signature: B512, tx_bytes: Bytes) -> Address {
  let mut hasher = Hasher::new();
  tx_bytes.hash(hasher);
  let tx_fuel = hasher.sha256();

  if let Result::Ok(pub_key_sig) = ec_recover_address(signature, tx_fuel) {
      return pub_key_sig;
  }

  return Address::from(INVALID_ADDRESS);
}

/// Verify a signature using the secp256r1 curve [Secp256r1]

///     - params:
///         - signature: the signature to verify
///         - digest: the digest of the message

///     - returns: the address of the signer
pub fn webauthn_verify(witness_index: u64, tx_bytes: Bytes) -> Address {
  let tx_webauthn = Bytes::from(tx_bytes);
  let webauthn = tx_witness_data::<WebAuthn>(witness_index);
  let sig_ptr:raw_ptr = __gtf::<raw_ptr>(witness_index, GTF_WITNESS_DATA);
  let digest = get_webauthn_digest(webauthn, sig_ptr, tx_webauthn);

  if let Result::Ok(pub_key_sig) = ec_recover_address_r1(webauthn.signature, digest) {
      return pub_key_sig;
  }

  return Address::from(INVALID_ADDRESS);
}