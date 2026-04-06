library;

pub const INVALID_ADDRESS = Address::from(0x0000000000000000000000000000000000000000000000000000000000000001);

pub const BYTE_WITNESS_TYPE_FUEL: u64 = 0x0000000000000001;
pub const BYTE_WITNESS_TYPE_WEBAUTHN: u64 = 0x0000000000000000;

pub const MAX_SIGNERS: u64 = 10; // if changed, sync with the predicate expected signers
pub const EMPTY_SIGNERS = [
    b256::zero(),
    b256::zero(),
    b256::zero(),
    b256::zero(),
    b256::zero(),
    b256::zero(),
    b256::zero(),
    b256::zero(),
    b256::zero(),
    b256::zero(),
];

pub const PREFIX_BAKO_SIG: [u8; 4] = [66, 65, 75, 79];

pub const PREFIX_BAKO_SIG_LEN: u64 = __size_of_val(PREFIX_BAKO_SIG);

pub const ASCII_MAP: [u8; 16] = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102];

pub const ETHEREUM_PREFIX = 0x19457468657265756d205369676e6564204d6573736167653a0a363400000000;
