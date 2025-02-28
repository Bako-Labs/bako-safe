script;

use libraries::{
    // utilities::{
    //     transaction_hash
    // }
    tx_hash::*,
};

fn main() -> bool{
    let utxo = 0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07;

    tx_hash(utxo);
    true


}