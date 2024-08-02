script;

use std::{
    tx::{
        tx_witness_data,
        tx_witnesses_count,
        tx_id,
        GTF_WITNESS_DATA,
    },
    bytes::Bytes,
    ecr::{
        ec_recover_address,
    },
    hash::*,
};

use libraries::{
    ascii::b256_to_ascii_bytes,
    recover_signature::{
        fuel_verify, 
        secp256r1_verify,
    },
    webauthn_digest::{
      get_webauthn_digest, 
    },
    entities::{
        WebAuthn,
    },
};

use std::b512::{B512};






fn main() {
    const WEBAUTHN_TX_ID =0x361928fde57834469c1f2d9bbf858cda73d431e6b1b04149d6836a7c2e890410;
    const WEBAUTHN_ADDRESS = 0x9962da540401d92e1d06a61a0a41428f64cadf5d821b2f7f51b9c18dfdc7d2e2;

    let mut i_witnesses = 0;
    let tx_bytes = b256_to_ascii_bytes(WEBAUTHN_TX_ID);
    
    while i_witnesses < tx_witnesses_count() {

            match __gtf::<raw_ptr>(i_witnesses, GTF_WITNESS_DATA).read::<u64>() {
                0x0000000000000012 => {
                    let webauthn = tx_witness_data::<WebAuthn>(i_witnesses);
                    let sig_ptr:raw_ptr = __gtf::<raw_ptr>(i_witnesses, GTF_WITNESS_DATA);
                    let digest = get_webauthn_digest(webauthn, sig_ptr, tx_bytes);
                    log(0)
                }
                0x0000000000000016 => {
                    let sig_ptr = __gtf::<raw_ptr>(i_witnesses, GTF_WITNESS_DATA);
                    let data = raw_slice::from_parts::<u8>(sig_ptr, __size_of::<u16>() + __size_of::<B512>());
                    // let buff = Bytes::from(data);
                    log(__gtf::<raw_ptr>(i_witnesses, GTF_WITNESS_DATA).read::<u64>());
                    log(__gtf::<raw_ptr>(i_witnesses, GTF_WITNESS_DATA).add::<u8>(8).read::<B512>());
                }
                _ => {
                }
            };

        i_witnesses += 1;
    }

}