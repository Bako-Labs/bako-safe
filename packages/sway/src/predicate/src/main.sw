predicate;

use std::{
  b512::B512, 
  bytes::Bytes,
  constants::ZERO_B256,
  hash::{
    Hash, 
    Hasher
  },
  tx::{
    tx_id,
    tx_witness_data, 
    tx_witnesses_count,
    GTF_WITNESS_DATA,
    GTF_SCRIPT_WITNESS_AT_INDEX
  },
};
use libraries::{
  ascii::b256_to_ascii_bytes,
  recover_signature::{
      Signature,
      fuel_verify, 
      secp256r1_verify
    },
    webauthn_digest::{
      WebAuthn,
      get_webauthn_digest, 
    } 
};


/// Configurables:

///     Parameters:
///         SIGNERS: list of public keys that are allowed to sign
///             - SIGNERS different ZERO_B256 must be greater than zero
///             - SIGNERS different ZERO_B256 must be greater than or equal to 10
///             - SIGNERS different ZERO_B256 must be greater than or equal to SIGNATURES_COUNT
///         SIGNATURES_COUNT: number of signatures required
///             - SIGNATURES_COUNT different ZERO_B256
///         HASH_PREDICATE: hash of the predicate
///             - HASH_PREDICATE different ZERO_B256
configurable {
    SIGNERS: [b256; 10] = [
        ZERO_B256,
        ZERO_B256,
        ZERO_B256,
        ZERO_B256,
        ZERO_B256,
        ZERO_B256,
        ZERO_B256,
        ZERO_B256,
        ZERO_B256,
        ZERO_B256,
    ],
    SIGNATURES_COUNT: u64 = 0,
    HASH_PREDICATE: b256 = ZERO_B256
}
const MAX_SIGNERS: u64 = 10;


/// Validate signature:

///     params: 
///         - public_key: public key to validate
///         - verified_signatures: list of verified signatures
///     process:
///         - check if the public key is a signer
///         - check if the public key is already verified
///     return:
///         - 1 if the public key is a signer and not already verified
///         - 0 if the public key is not a signer or already verified
fn verify_signer_exists(public_key: Address, verified_signatures: Vec::<Address>) -> u64 {
    let mut i_signer = 0;
    while i_signer <  MAX_SIGNERS {
        if (public_key == Address::from(SIGNERS[i_signer])) {
            let mut i_verified = 0;
            while i_verified < verified_signatures.len() {
                if (verified_signatures.get(i_verified).unwrap() == public_key) {
                    return 0;
                }
                i_verified += 1;
            }
            return 1;
        }
        i_signer += 1;
    }
    return 0;
}

/// Validate signature:

///     process:
///         - get the transaction hash
///         - get the number of witnesses
///         - get the witnesses
///         - recover the public key from the signature
///         - check if the public key is a signer
///         - check if the public key is already verified
///         - increase the number of valid signatures
///         - check if the number of valid signatures is greater than the required
///     return:
///         - 1 if the minimum number of signatures is reached
///         - 0 if the minimum number of signatures is not reached 
fn main() -> bool {

  let tx_bytes = b256_to_ascii_bytes(tx_id());
  let mut hasher = Hasher::new();
  tx_bytes.hash(hasher);
  let tx_hash = hasher.sha256();


  let mut i_witnesses = 0;
  let mut valid_signatures:u64 = 0;
  let witness_count = tx_witnesses_count();
  let mut verified_signatures = Vec::with_capacity(MAX_SIGNERS);
  


  // redundant check, but it is necessary to avoid compiler errors
  if(HASH_PREDICATE != HASH_PREDICATE) {
      return false;
  }


  while i_witnesses < witness_count {
    let sig_ptr:raw_ptr = __gtf::<raw_ptr>(i_witnesses, GTF_WITNESS_DATA);
    let mut _public_key: Address = Address::from(ZERO_B256);
    let mut _is_valid_signature: u64 = 0;

    match sig_ptr.read::<Signature>() {
      // Webauthn signature
      Signature::webauth(webauthn) => {
        let (digest, signature) = get_webauthn_digest(webauthn, sig_ptr, tx_bytes);
        _public_key = secp256r1_verify(signature, digest);
        _is_valid_signature = verify_signer_exists(_public_key, verified_signatures);
      }
      // Fuel signature
      _ => {
        let signature = tx_witness_data::<B512>(i_witnesses);
        _public_key = fuel_verify(signature, tx_hash);
        _is_valid_signature = verify_signer_exists(_public_key, verified_signatures);
      }
    };

    if (_is_valid_signature == 1) {
      verified_signatures.push(_public_key);
      valid_signatures += 1;
    }


    i_witnesses += 1;
  }


  return valid_signatures >= SIGNATURES_COUNT;
}

/*
  /// todo:
  ///     - add the ability to add more signers
  ///     - add the ability to add more signature types from other chains (e.g. evm, solana, etc.)
*/