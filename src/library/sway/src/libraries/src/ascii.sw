library;

use std::{bytes::Bytes};

const ASCII_MAP: [u8; 16] = [
    48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102
];

fn byte_to_ascii(bytes: Bytes, ref mut ascii_bytes: Bytes, i: u8) {
    let b = bytes.get(i).unwrap();
    ascii_bytes.push(ASCII_MAP[b >> 4]);
    ascii_bytes.push(ASCII_MAP[b & 15]);
}

pub fn b256_to_ascii_bytes(val: b256) -> Bytes {
    let bytes = Bytes::from(val);
    let mut ascii_bytes = Bytes::with_capacity(64);

    byte_to_ascii(bytes, ascii_bytes, 0);
    byte_to_ascii(bytes, ascii_bytes, 1);
    byte_to_ascii(bytes, ascii_bytes, 2);
    byte_to_ascii(bytes, ascii_bytes, 3);
    byte_to_ascii(bytes, ascii_bytes, 4);
    byte_to_ascii(bytes, ascii_bytes, 5);
    byte_to_ascii(bytes, ascii_bytes, 6);
    byte_to_ascii(bytes, ascii_bytes, 7);
    byte_to_ascii(bytes, ascii_bytes, 8);
    byte_to_ascii(bytes, ascii_bytes, 9);
    byte_to_ascii(bytes, ascii_bytes, 10);
    byte_to_ascii(bytes, ascii_bytes, 11);
    byte_to_ascii(bytes, ascii_bytes, 12);
    byte_to_ascii(bytes, ascii_bytes, 13);
    byte_to_ascii(bytes, ascii_bytes, 14);
    byte_to_ascii(bytes, ascii_bytes, 15);
    byte_to_ascii(bytes, ascii_bytes, 16);
    byte_to_ascii(bytes, ascii_bytes, 17);
    byte_to_ascii(bytes, ascii_bytes, 18);
    byte_to_ascii(bytes, ascii_bytes, 19);
    byte_to_ascii(bytes, ascii_bytes, 20);
    byte_to_ascii(bytes, ascii_bytes, 21);
    byte_to_ascii(bytes, ascii_bytes, 22);
    byte_to_ascii(bytes, ascii_bytes, 23);
    byte_to_ascii(bytes, ascii_bytes, 24);
    byte_to_ascii(bytes, ascii_bytes, 25);
    byte_to_ascii(bytes, ascii_bytes, 26);
    byte_to_ascii(bytes, ascii_bytes, 27);
    byte_to_ascii(bytes, ascii_bytes, 28);
    byte_to_ascii(bytes, ascii_bytes, 29);
    byte_to_ascii(bytes, ascii_bytes, 30);
    byte_to_ascii(bytes, ascii_bytes, 31);

    ascii_bytes
}
