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
    // const WEBAUTHN_TX_ID =0x96434c01712899770803277f193d2bb00bc8cff1799fe364ffe6b07404078fbe;

    // const WEBAUTHN_ADDRESS = 0x511f2e17ba75934fa428227a7e9d879d3be118a15a907122c530691c1203a40d;
    //log("Hello, World!");
    // let SIG: [b256;2] = [
    //     0x92dffc873b56f219329ed03bb69bebe8c3d8b041088574882f7a6404f02e2f28,
    //     0x639880ece7753a32e09164d14dad7436c57737e567f18b98f6ee30fec6b247ec,
    // ];
    log(tx_witnesses_count());
    log(tx_id());


    // let tx_bytes = b256_to_ascii_bytes(tx_id());
    // let mut hasher = Hasher::new();
    // tx_bytes.hash(hasher);
    // let tx_hash = hasher.sha256();


    // log(Address::from(INVALID_ADDRESS));
    // log(Address::from(SIG[0]));
    // log(Address::from(SIG[1]));

    let mut i_witnesses = 0;
    
    while i_witnesses < tx_witnesses_count() {
        //let mut witness = tx_witness_data::<B512>(i_witnesses);
        let sig_ptr:raw_ptr = __gtf::<raw_ptr>(i_witnesses, GTF_WITNESS_DATA);

        // //if(i_witnesses == tx_witnesses_count()-1) {

            match sig_ptr.read::<Signature>() {
                // Webauthn signature
                Signature::webauth(webauthn) => {
                    //let mut witness = tx_witness_data::<WebAuthn>(i_witnesses);
                    log(webauthn);
                }
                // Fuel signature
                _ => {
                    log(false);
                }
            };
        //}
        // log(sig_ptr.read::<Signature>() == Signature::webauth(WEBAUTHN_ADDRESS));
        //let mut value = ec_recover_address(witness, tx_hash).unwrap();
        // log(value == Address::from(SIG[0]));
        //log(fuel_verify(witness, tx_hash));
        //log(witness);
        // log(ec_recover_address(witness, tx_id()));
        i_witnesses += 1;
    }

}