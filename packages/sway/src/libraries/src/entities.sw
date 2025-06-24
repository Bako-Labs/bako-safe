library;

use std::{
    b512::B512,
    vm::evm::{
        evm_address::EvmAddress,
    },
    ops::{
        PartialEq
    },
};

pub enum SignatureType {
    WebAuthn: WebAuthnHeader,
    Fuel: FuelHeader,
    Evm: EvmHeader,
}
pub struct WebAuthnHeader {
    pub signature: B512,
    pub prefix_size: u64,
    pub suffix_size: u64,
    pub message_data_size: u64,
}
pub struct FuelHeader {
    pub signature: B512,
}
pub struct EvmHeader {
    pub signature: B512,
}

pub struct SignedData {
    pub transaction_id: (b256, b256),
    pub ethereum_prefix: b256,
    #[allow(dead_code)]
    pub empty: b256,
}

pub enum SignatureAddress {
    FUEL: Address,
    EVM: EvmAddress,
}

impl PartialEq for SignatureAddress {
    fn eq(self, other: Self) -> bool {
        match (self, other) {
            (SignatureAddress::FUEL(a), SignatureAddress::FUEL(b)) => a == b,
            (SignatureAddress::EVM(a), SignatureAddress::EVM(b)) => a == b,
            _ => false,
        }
    }
}