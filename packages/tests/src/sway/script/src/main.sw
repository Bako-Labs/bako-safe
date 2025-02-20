script;

use std::{
    inputs::*,
    outputs::*,
    hash::*,
    tx::*,
    auth::predicate_address,
    bytes::*,
    alloc::*,
    b512::*,
};


struct TxScript {
    tx_type: u8,
    scriptGasLimit: u64,
    receiptsRoot: b256,
    scriptLength: u64,
    scriptDataLength: u64,
    policyTypes: u32,
    inputsCount: u16,
    outputsCount: u16,
    witnessesCount: u16,
    // script
    // scriptData
    // policy
}

// enum Policy {
//     0x00000008: PolicyMaxFee
// }

struct PolicyType {
    policy_type: u8,
}

struct PolicyTip {
    tip: u64,
}
struct PolicyWitnessLimit {
    witness_limit: u64,
}
struct PolicyMaturity {
    maturity: u32,
}
struct PolicyExpiration {
    expiration: u32,
}
struct PolicyMaxFee {
    max_fee: u64,
}


fn get_tx_ptr() -> (raw_ptr, u64) {
    let tx_ptr = asm(r1) {
        gm r1 i5;
        r1: raw_ptr
    };
    let tx_len = __gtf::<u64>(0, GTF_TX_LENGTH);
    return (tx_ptr, tx_len);
}


// pegar o hash do script da tx tipo script
// devolve o hash do script
// precisa:
    // tamanho do dado
    // ponteiro para o dado
    // offset para o inicio do dado

// processo
    // aloque memória para o script
    // pegue o ponteiro do script e adicione um novo offset(inicio de leitura)
    // copie os bytes do script para a memória alocada
    // monte a hash a partir dos bytes do script e retorne
fn bytecode2hash(len: u64, ptr: raw_ptr, offset: u64) -> b256 {
    let mut ptr_bytes = alloc::<u8>(len);
    let ptr_intent = ptr.add_uint_offset(offset);
    ptr_intent.copy_bytes_to(ptr_bytes, len);

    let mut hash = b256::zero();
    asm(
        ptr_bytes: ptr_bytes,
        hash: hash,
        size: len
    ){
        s256 hash ptr_bytes size;
        hash: b256
    }
}


fn main() {
    let (tx_ptr, tx_len) = get_tx_ptr();
    let tx_ptr_copy = alloc::<u8>(tx_len);
    tx_ptr.copy_bytes_to(tx_ptr_copy, tx_len);
    
    let tx_script: TxScript = tx_ptr_copy.read::<TxScript>();

    // script
    let offset_script = __size_of::<TxScript>();
    let hash_script = bytecode2hash(tx_script.scriptLength, tx_ptr_copy, offset_script);
    log(hash_script);
    // script data
    let offset_script_data = __size_of::<TxScript>() + tx_script.scriptLength;
    let hash_data = bytecode2hash(tx_script.scriptDataLength, tx_ptr_copy, offset_script_data);
    log(hash_data);

    // policy
    let offset_policy = __size_of::<TxScript>() + tx_script.scriptLength + tx_script.scriptDataLength;
    let policy_type = tx_ptr_copy.add_uint_offset(offset_policy).read::<PolicyMaxFee>();
    let hash_policy = bytecode2hash(__size_of::<PolicyMaxFee>(), tx_ptr_copy, offset_policy);

    log(hash_policy);
    log(tx_script.policyTypes);
    log(policy_type.max_fee);


    // let offset_policy = __size_of::<TxScript>() + tx_script.scriptLength + tx_script.scriptDataLength;

    // let policy_type = tx_ptr_copy.add_uint_offset(offset_policy).read::<PolicyType>();




}