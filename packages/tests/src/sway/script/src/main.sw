script;

use std::{
    b512::B512,
    tx::{GTF_WITNESS_DATA, tx_witnesses_count},
    ecr::ec_recover_address,
};

use libraries::{
    utilities::{
        b256_to_ascii_bytes
    },
    tx_hash::*,
};

fn main(signature: B512) -> b256{
    let utxo = 0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07;

    let tx_hash = tx_hash(utxo);
    let tx_bytes = b256_to_ascii_bytes(tx_hash);



    let mut digest = b256::zero();
    asm(
            value: tx_bytes, 
            size: tx_bytes.len(), 
            r1: digest
    ) {
            s256 r1 value size;
    };


    log(tx_hash);
    log(digest);

    return digest;
}