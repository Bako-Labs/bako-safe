predicate;

use std::{b512::B512, tx::{GTF_WITNESS_DATA, tx_id, tx_witnesses_count}};

use libraries::{
    constants::{
        BYTE_WITNESS_TYPE_FUEL,
        BYTE_WITNESS_TYPE_WEBAUTHN,
        EMPTY_SIGNERS,
        INVALID_ADDRESS,
        MAX_SIGNERS,
        PREFIX_BAKO_SIG_LEN,
    },
    entities::{
        SignatureAddress,
        SignatureType,
        WebAuthnHeader,
    },
    recover_signature::{
        evm_verify,
        fuel_verify,
        webauthn_verify,
    },
    utilities::{
        b256_to_ascii_bytes,
        clear_zero_signers,
    },
    validations::{
        check_duplicated_signers,
        check_signer_exists,
        verify_prefix,
    },
    webauthn_digest::{
        get_webauthn_digest,
    },
};

configurable {
    SIGNERS: [b256; 10] = EMPTY_SIGNERS,
    SIGNATURES_COUNT: u64 = 0,
    #[allow(dead_code)]
    HASH_PREDICATE: b256 = b256::zero(),
}

fn main() -> bool {
    let signers = clear_zero_signers(SIGNERS);

    let mut i_witnesses = 0;
    let mut verified_signatures: Vec<SignatureAddress> = Vec::with_capacity(MAX_SIGNERS);

    while i_witnesses < tx_witnesses_count() {
        let mut witness_ptr = __gtf::<raw_ptr>(i_witnesses, GTF_WITNESS_DATA);
        if (verify_prefix(witness_ptr)) {
            let tx_id_b256 = tx_id();
            let tx_bytes = b256_to_ascii_bytes(tx_id_b256); // are used
            witness_ptr = witness_ptr.add_uint_offset(PREFIX_BAKO_SIG_LEN); // skip bako prefix
            let signature = witness_ptr.read::<SignatureType>();
            witness_ptr = witness_ptr.add_uint_offset(__size_of::<u64>()); // skip enum size
            let pk: SignatureAddress = match signature {
                SignatureType::WebAuthn(signature_payload) => {
                    let data_ptr = witness_ptr.add_uint_offset(__size_of::<WebAuthnHeader>());

                    webauthn_verify(
                        get_webauthn_digest(signature_payload, data_ptr, tx_bytes),
                        signature_payload,
                    )
                },
                SignatureType::Fuel(_) => {
                    let signature = witness_ptr.read::<B512>();

                    fuel_verify(signature, tx_bytes)
                },
                SignatureType::Evm(_) => {
                    let signature = witness_ptr.read::<B512>();

                    evm_verify(signature, tx_id_b256)
                },
                _ => SignatureAddress::FUEL(INVALID_ADDRESS),
            };

            if (check_signer_exists(pk, SIGNERS)) {
                check_duplicated_signers(pk, verified_signatures);
            }
        }

        i_witnesses += 1;
    }

    return verified_signatures.len() >= SIGNATURES_COUNT;
}
