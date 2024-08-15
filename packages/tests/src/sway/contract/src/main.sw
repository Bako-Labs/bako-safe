contract;

// ANCHOR: abi
abi Counter {
    fn seven() -> u64;
    fn zero() -> u64;
}

impl Counter for Contract {
    fn seven() -> u64 {
        log(7);
        7
    }

    fn zero() -> u64 {
        log(0);
        0
    }
}
// ANCHOR_END: counter
