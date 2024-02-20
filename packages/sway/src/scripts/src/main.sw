script;

use std::{tx::tx_witness_data, tx::{tx_witnesses_count, tx_id}, b512::B512, ecr::ec_recover_address, bytes::Bytes, hash::* };


const ASCII_MAP: [u8; 16] = [
    48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102
];

pub fn b256_to_ascii_bytes(val: b256) -> Bytes {
    let bytes = Bytes::from(val);
    let mut ascii_bytes = Bytes::with_capacity(63);
    let mut idx = 0;

    while idx < 32 {
      let b = bytes.get(idx).unwrap();
      ascii_bytes.push(ASCII_MAP[(b >> 4).as_u64()]);
      ascii_bytes.push(ASCII_MAP[(b & 15).as_u64()]);
	    idx = idx + 1;
    }

    ascii_bytes
}

fn main() {
    let data = tx_witnesses_count();
    let mut i=0;
    //let tx_id =0x53de37ae51fcfecb17ee3589f68904ac75bf5ec109edeb1065ccb63145287da6;
    let mut count = 0;
    
    let mut hasher = Hasher::new();
    //log(tx_id);
    let tx_bytes = tx_id();

    tx_bytes.hash(hasher);
    //let tx_hash = hasher.sha256();

    log(tx_bytes);
    //log(tx_hash);

    while i < data {
        let w = tx_witness_data::<B512>(i);
        //log(tx_witness_data::<B512>(i));
        

        // ---->
        //log(tx_hash);

        let verify = ec_recover_address(w, tx_bytes);

        //log(verify);

        i += 1;
    }
    //log(12)
}