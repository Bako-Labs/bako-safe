predicate;

use std::{
  constants::ZERO_B256,
  tx::{
    tx_id,
    tx_witnesses_count,
    GTF_WITNESS_DATA,
  },
};

use libraries::{
  ascii::{
    b256_to_ascii_bytes,
  },
  recover_signature::{
    fuel_verify, 
    webauthn_verify,
  },
  validations::{
    check_signer_exists,
    check_duplicated_signers,
  },
  constants::{
      MAX_SIGNERS,
      EMPTY_SIGNERS,
      INVALID_ADDRESS,
      BYTE_WITNESS_TYPE_FUEL,
      BYTE_WITNESS_TYPE_WEBAUTHN,
  }
};

configurable {
    SIGNERS: [b256; 10] = EMPTY_SIGNERS,
    SIGNATURES_COUNT: u64 = 0,
    HASH_PREDICATE: b256 = ZERO_B256
}


fn main() -> bool {
  let tx_bytes = b256_to_ascii_bytes(tx_id());

  let mut i_witnesses = 0;
  // let mut verified_signatures = Vec::with_capacity(MAX_SIGNERS);


  // while i_witnesses < tx_witnesses_count() {

  //   let mut _is_valid_signature: u64 = 0;

  //   let pk: Address = match __gtf::<raw_ptr>(i_witnesses, GTF_WITNESS_DATA).read::<u64>() {
  //       BYTE_WITNESS_TYPE_WEBAUTHN => webauthn_verify(i_witnesses, tx_bytes),
  //       BYTE_WITNESS_TYPE_FUEL => fuel_verify(i_witnesses, tx_bytes),
  //       _ => Address::from(INVALID_ADDRESS),
  //   };


  //   let is_valid_signer = check_signer_exists(pk, SIGNERS);
  //   check_duplicated_signers(is_valid_signer, verified_signatures);

  //   i_witnesses += 1;
  // }


  // redundant check, but it is necessary to avoid compiler errors
  if(HASH_PREDICATE != HASH_PREDICATE) {
      return false;
  }

  //return verified_signatures.len() >= SIGNATURES_COUNT;
  return true;
}

/*
  todo:
      - add the ability to add more signers
      - add the ability to add more signature types from other chains (e.g. evm, solana, etc.)
*/