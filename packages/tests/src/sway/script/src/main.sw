script;

use std::{
    b512::B512,
    tx::{GTF_WITNESS_DATA, tx_witnesses_count, tx_witness_data},
    ecr::ec_recover_address,
};

use libraries::{
    utilities::{
        b256_to_ascii_bytes
    },
    tx_hash::*,
    witnesses::*
};

fn main(required_signers: u64, signers: [b256; 10], utxo_ref: b256) -> bool {
    let mut s: Vec<Address> = Vec::with_capacity(10);
    let mut i = 0;
    while i < 10 {
        s.push(Address::from(signers[i]));
        i += 1;
    }

    let res = verify_witnesses(required_signers, s, utxo_ref);
    log(res);


    res
}