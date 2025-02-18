script;


use std::tx::{GTF_TX_LENGTH, GTF_TYPE, GTF_POLICY_MAX_FEE, GTF_SCRIPT_INPUTS_COUNT};
use std::b512::B512;
use std::alloc::alloc_bytes;
use std::hash::Hasher;


pub struct Tx {
    t_type: u8,
    script_gas_limit: u64,
    receipts_root: [u8; 32],
    script_length: u64,
    script_data_length: u64,
    policy_types: u32,
    inputs_count: u16,
    outputs_count: u16,

}

fn main() -> u32 {

    // example sum
    // let num: u32 = 5;

    // asm(r1: num, r2) {
    //     add r2 r1 one;
    //     r2: u32
    // }

    let mut base_asset = b256::zero();
    
    log(asm (base_asset) {
        gm base_asset i6;
        base_asset: b256
    });

    let tx_len = match Some(__gtf::<u64>(0, GTF_TX_LENGTH)) {
        Some(len) => len,
        _ => return 0,
    };
    let mut tx_start = alloc_bytes(8);
    asm(tx_start) {
        gm tx_start i5;
    };

    let data = tx_start.read::<Tx>();

    log(data.t_type);
    log(data.script_gas_limit);
    log(data.receipts_root);
    log(data.script_length);
    log(data.script_data_length);
    log(data.policy_types);
    log(data.inputs_count);
    log(data.outputs_count);

    return 12
    

}
