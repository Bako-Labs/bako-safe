// TODO: we should render this code dynamicly in the future
// To increate the size of signatures
predicate;

use std::{b512::B512, ecr::ec_recover_address, tx::tx_id, tx::tx_witness_data, tx::tx_witnesses_count, bytes::Bytes};
use libraries::{ascii::b256_to_ascii_bytes};

configurable {
    SIGNERS: [b256; 10] = [
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
    ],
    SIGNATURES_COUNT: u64 = 0
}

fn check_signature(index: u64, tx_hash: b256) -> u64 {
    // If the index is bigger than the witness count
    // return false because the signature does not exist
    // and if we try to access it, it will panic
    if (index >= tx_witnesses_count()) {
        return 0;
    }

    // Get the singature from the witness field
    let signature = tx_witness_data::<B512>(index);

    // Check if the signature is valid and if the address
    // is one of the signers list
    if let Result::Ok(pub_key_sig) = ec_recover_address(signature, tx_hash) {
        let address = pub_key_sig.value;
        if (address == SIGNERS[0] ||
            address == SIGNERS[1] ||
            address == SIGNERS[2] ||
            address == SIGNERS[3] ||
            address == SIGNERS[4] ||
            address == SIGNERS[5] ||
            address == SIGNERS[6] ||
            address == SIGNERS[7] ||
            address == SIGNERS[8] ||
            address == SIGNERS[9]) {
            return 1;
        }
    }
    return 0;
}

fn main() -> bool {
    let mut verified = 0;
    let tx_id_hash = tx_id();
    let tx_hash = b256_to_ascii_bytes(tx_id_hash).sha256();
    let witness_count = tx_witnesses_count();

    // If there are no signatures, return false
    if (witness_count < SIGNATURES_COUNT) {
        return false;
    }

    // If there are more signatures
    // check if wich ones are valid
    // We need to check if the signature exists before
    // trying to access it
    verified = verified + check_signature(0, tx_hash);
    verified = verified + check_signature(1, tx_hash);
    verified = verified + check_signature(2, tx_hash);
    verified = verified + check_signature(3, tx_hash);
    verified = verified + check_signature(4, tx_hash);
    verified = verified + check_signature(5, tx_hash);
    verified = verified + check_signature(6, tx_hash);
    verified = verified + check_signature(7, tx_hash);
    verified = verified + check_signature(8, tx_hash);
    verified = verified + check_signature(9, tx_hash);

    return verified >= SIGNATURES_COUNT;
}
