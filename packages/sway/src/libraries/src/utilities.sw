library;

use std::bytes::Bytes;
use ::entities::SignedData;
use ::constants::{ASCII_MAP, ETHEREUM_PREFIX};

pub fn b256_to_ascii_bytes(val: b256) -> Bytes {
    let bytes = Bytes::from(val);
    let mut ascii_bytes = Bytes::with_capacity(64);
    let mut idx = 0;
    while idx < 32 {
        let b = bytes.get(idx).unwrap();
        ascii_bytes.push(ASCII_MAP[(b >> 4).as_u64()]);
        ascii_bytes.push(ASCII_MAP[(b & 15).as_u64()]);
        idx = idx + 1;
    }
    ascii_bytes
}

pub fn write_bytes(target_ptr: raw_ptr, src_ptr: raw_ptr, size: u64) {
    asm(target_ptr: target_ptr, src_ptr: src_ptr, size: size) {
        mcp target_ptr src_ptr size;
    };
}

pub fn hash_tx_id(value: Bytes) -> b256 {
    let mut digest = b256::zero();
    asm(value: value.ptr(), size: value.len(), r1: digest) {
        s256 r1 value size;
    };
    digest
}

pub fn personal_sign_hash(transaction_id: b256) -> b256 {
    // Hack, allocate memory to reduce manual `asm` code.
    let transaction_id_utf8 = b256_to_ascii_bytes_split(transaction_id);
    let data = SignedData {
        transaction_id: transaction_id_utf8,
        ethereum_prefix: ETHEREUM_PREFIX,
        empty: b256::zero(),
    };
    // Pointer to the data we have signed external to Sway.
    let data_ptr = asm(ptr: data.transaction_id) {
        ptr
    };
    // The Ethereum prefix is 28 bytes (plus padding we exclude).
    // The Tx ID is 64 bytes at the end of the prefix.
    let len_to_hash = 28 + 64;
    // Create a buffer in memory to overwrite with the result being the hash.
    let mut buffer = b256::min();
    // Copy the Tx ID to the end of the prefix and hash the exact len of the prefix and id (without
    // the padding at the end because that would alter the hash).
    asm(
        hash: buffer,
        tx_id: data_ptr,
        end_of_prefix: data_ptr + len_to_hash,
        prefix: data.ethereum_prefix,
        id_len: 64,
        hash_len: len_to_hash,
    ) {
        mcp end_of_prefix tx_id id_len;
        k256 hash prefix hash_len;
    }
    // The buffer contains the hash.
    buffer
}

pub fn b256_to_ascii_bytes_split(val: b256) -> (b256, b256) {
    let bytes = Bytes::from(val);
    let mut ascii_bytes = Bytes::with_capacity(64);
    let mut idx = 0;
    while idx < 32 {
        let b = bytes.get(idx).unwrap();
        ascii_bytes.push(ASCII_MAP[(b >> 4).as_u64()]);
        ascii_bytes.push(ASCII_MAP[(b & 15).as_u64()]);
        idx = idx + 1;
    }
    asm(ptr: ascii_bytes.ptr()) {
        ptr: (b256, b256)
    }
}
