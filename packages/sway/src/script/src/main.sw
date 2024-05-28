script;

use std::{
    tx::{
        tx_witness_data,
        tx_witnesses_count,
        tx_id,
        GTF_WITNESS_DATA,
    },
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
        INVALID_ADDRESS,
        Signature,  
    },
    webauthn_digest::{
      WebAuthn,
      get_webauthn_digest, 
    } 
};

use std::b512::{B512};






fn main() {
    const WEBAUTHN_TX_ID =0x361928fde57834469c1f2d9bbf858cda73d431e6b1b04149d6836a7c2e890410;
    const WEBAUTHN_ADDRESS = 0x9962da540401d92e1d06a61a0a41428f64cadf5d821b2f7f51b9c18dfdc7d2e2;

    let mut i_witnesses = 0;
    let tx_bytes = b256_to_ascii_bytes(WEBAUTHN_TX_ID);
    
    while i_witnesses < tx_witnesses_count() {

            match tx_witness_data::<Signature>(i_witnesses) {
                // Webauthn signature
                Signature::webauth(webauthn) => {
                    let sig_ptr:raw_ptr = __gtf::<raw_ptr>(i_witnesses, GTF_WITNESS_DATA);
                    let digest = get_webauthn_digest(webauthn, sig_ptr, tx_bytes);
                    let rec = secp256r1_verify(webauthn.signature, digest);
                    
                    // log(rec);
                    // log(Address::from(WEBAUTHN_ADDRESS));
                    log(rec == Address::from(WEBAUTHN_ADDRESS));

                }
                // Fuel signature
                _ => {
                }
            };

        i_witnesses += 1;
    }

}