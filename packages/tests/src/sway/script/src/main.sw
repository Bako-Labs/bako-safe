script;

use std::{
    inputs::*,
    outputs::*,
    hash::*,
    tx::*,
    auth::predicate_address,
    bytes::*,
    alloc::*,
};

pub struct TxScript {
    _type: u8,
    _scriptGasLimit: u64,
    _receiptsRoot: b256,
    _scriptLength: u64,
    _scriptDataLength: u64,
    _policyTypes: u32,
    _inputsCount: u16,
    _outputsCount: u16,
    _witnessesCount: u16,
    // script
    // scriptData
    // policy
    // inputs
    // outputs
    //todo: concat utxo
}

//     txID	byte[32]	Hash of transaction.
// outputIndex	uint16	Index of transaction output.
// owner	byte[32]	Owning address or predicate root.
// amount	uint64	Amount of coins.
// asset_id	byte[32]	Asset ID of the coins.
// txPointer	
// TXPointer
// Points to the TX whose output is being spent.
// witnessIndex	uint16	Index of witness that authorizes spending the coin.
// predicateGasUsed	uint64	Gas used by predicate.
// predicateLength	uint64	Length of predicate, in instructions.
// predicateDataLength	uint64	Length of predicate input data, in bytes.
// predicate	byte[]	Predicate bytecode.
// predicateData	byte[]	Predicate input data (parameters).

pub struct InputCoin {
    _txID: b256,
    _outputIndex: u16,
    _owner: b256,
    _amount: u64,
    _assetId: b256,
    _txPointer: (u32, u16),
    _witnessIndex: u16,
    _predicateGasUsed: u64,
    _predicateLength: u64,
    _predicateDataLength: u64,
}

pub struct InputContract {
    _txID: b256,
    _outputIndex: u16,
    _balanceRoot: b256,
    _stateRoot: b256,
    _txPointer: (u32, u16),
    _contractID: b256,
}

pub struct InputMessage {
    _sender: b256,
    _recipient: b256,
    _amount: u64,
    _nonce: b256,
    _witnessIndex: u16,
    _predicateGasUsed: u64,
    _dataLength: u64,
    _predicateLength: u64,
    _predicateDataLength: u64,
}


fn get_tx_ptr() -> (raw_ptr, u64) {
    let tx_ptr = asm(r1) {
        gm r1 i5;
        r1: raw_ptr
    };
    let tx_len = __gtf::<u64>(0, GTF_TX_LENGTH);
    return (tx_ptr, tx_len);
}


fn main() {
    let (tx_ptr, tx_len) = get_tx_ptr();
    let tx_new_ptr = alloc::<u8>(tx_len);
    
    let transaction_type = tx_type();

    // Copy tx bytes to new bytes
    tx_ptr.copy_bytes_to(tx_new_ptr, __size_of::<TxScript>());

    match transaction_type {
        Transaction::Script => {
            let tx_script2: TxScript = tx_new_ptr.read::<TxScript>();
            let mut current_index: u64 = __size_of::<TxScript>() - __size_of::<(u16, u16, u16, u64)>();
            
            // Policy
            tx_ptr.add::<u8>(current_index).copy_bytes_to(tx_new_ptr.add::<u8>(current_index), __size_of::<u64>());
            current_index = current_index + __size_of::<u64>();

            // TODO: this will change once we know how many inputs should be signed
            // Zero out inputs count
            tx_new_ptr.add::<u8>(current_index).write::<u16>(0);
            current_index = current_index + __size_of::<(u16)>();

            // Zero out outputs count
            tx_new_ptr.add::<u8>(current_index).write::<u16>(1);
            current_index = current_index + __size_of::<u16>();

            // Zero out the witnesses count
            tx_new_ptr.add::<u8>(current_index).write::<u16>(0);
            current_index = current_index + __size_of::<u16>();

            // Copy script
            // tx_ptr copia byte para tx_new_ptr
            tx_ptr.add::<u8>(current_index).copy_bytes_to(tx_new_ptr.add::<u8>(current_index),tx_script2._scriptLength);
            current_index = current_index + tx_script2._scriptLength;

            // Copy script data
            tx_ptr.add::<u8>(current_index).copy_bytes_to(tx_new_ptr.add::<u8>(current_index), tx_script2._scriptDataLength);
            current_index = current_index + tx_script2._scriptDataLength;

            // Jump TX Policy
            // todo: create a types for policy
            tx_ptr.add::<u8>(current_index).copy_bytes_to(tx_new_ptr.add::<u8>(current_index), __size_of::<u64>());
            current_index = current_index + __size_of::<u64>();

            let mut new_ptr_current_index: u64 = current_index;
            let mut input_index: u16 = 0;
            while input_index < tx_script2._inputsCount {
                let input_type = tx_ptr.add::<u8>(current_index).read::<Input>();
                current_index = current_index + __size_of::<Input>();

                match input_type {
                    Input::Coin => {
                        // Skip InputCoin
                        let input_coin: InputCoin = tx_ptr.add::<u8>(current_index).read::<InputCoin>();
                        log(input_coin._txID);
                        current_index = current_index + __size_of::<InputCoin>();
                        current_index = current_index + input_coin._predicateLength;
                        current_index = current_index + input_coin._predicateDataLength;
                    },
                    Input::Contract => {
                        // Skip InputContract
                        current_index = current_index + __size_of::<InputContract>();
                    },
                    Input::Message => {
                        // Skip InputContract
                        let input_message: InputMessage = tx_ptr.add::<u8>(current_index).read::<InputMessage>();
                        current_index = current_index + __size_of::<InputMessage>();
                        current_index = current_index + input_message._dataLength;
                        current_index = current_index + input_message._predicateLength;
                        current_index = current_index + input_message._predicateDataLength;
                    },
                };
                input_index += 1;
            }

            // outputs
            let mut output_index: u16 = 0;
            while output_index < tx_script2._outputsCount {
                let output_type = tx_ptr.add::<u8>(current_index).read::<Output>();
                tx_ptr.add::<u8>(current_index).copy_bytes_to(tx_new_ptr.add::<u8>(new_ptr_current_index), __size_of::<Output>());
                current_index = current_index + __size_of::<Output>();
                new_ptr_current_index = new_ptr_current_index + __size_of::<Output>();

                match output_type {
                    Output::Coin => {
                        tx_ptr.add::<u8>(current_index).copy_bytes_to(tx_new_ptr.add::<u8>(new_ptr_current_index), __size_of::<(b256, u64, b256)>());
                        current_index = current_index + __size_of::<(b256, u64, b256)>();
                        new_ptr_current_index = new_ptr_current_index + __size_of::<(b256, u64, b256)>();
                    },
                    Output::Contract => {
                        // Write witness index
                        tx_ptr.add::<u8>(current_index).copy_bytes_to(tx_new_ptr.add::<u8>(new_ptr_current_index), __size_of::<u16>());
                        // Zero Out balanceRoot and stateRoot so just skip
                        current_index = current_index + __size_of::<(u16, b256, b256)>();
                        new_ptr_current_index = new_ptr_current_index + __size_of::<(u16, b256, b256)>();
                    },
                    Output::Change => {
                        // Write to address
                        tx_ptr.add::<u8>(current_index).copy_bytes_to(tx_new_ptr.add::<u8>(new_ptr_current_index), __size_of::<b256>());
                        current_index = current_index + __size_of::<b256>();
                        new_ptr_current_index = new_ptr_current_index + __size_of::<b256>();
                        // Zero Out amount
                        current_index = current_index + __size_of::<u64>();
                        new_ptr_current_index = new_ptr_current_index + __size_of::<u64>();
                        // Write to assetId
                        tx_ptr.add::<u8>(current_index).copy_bytes_to(tx_new_ptr.add::<u8>(new_ptr_current_index), __size_of::<b256>());
                        current_index = current_index + __size_of::<b256>();
                        new_ptr_current_index = new_ptr_current_index + __size_of::<b256>();
                    },
                    Output::Variable => {
                        // Zero out all fields to, amout, assetId
                        current_index = current_index + __size_of::<(b256, u64, b256)>();
                        new_ptr_current_index = new_ptr_current_index + __size_of::<(b256, u64, b256)>();
                    },
                    Output::ContractCreated => {
                        tx_ptr.add::<u8>(current_index).copy_bytes_to(tx_new_ptr.add::<u8>(new_ptr_current_index), __size_of::<(b256, b256)>());
                        current_index = current_index + __size_of::<(b256, b256)>();
                        new_ptr_current_index = new_ptr_current_index + __size_of::<(b256, b256)>();
                    },
                }
                output_index += 1;
            }
            
            log(raw_slice::from_parts::<u8>(tx_new_ptr, new_ptr_current_index));
        },
        _ => {
            log(0);
        }
    }

    // let tx_type = tx_ptr.read::<u8>();
    // tx_ptr.copy_bytes_to(tx_new_ptr, tx_len);
    
    
    
    // let mut input_index = tx_script._outputsCount;
    // while tx_script._outputsCount > 0 {
    //     tx_script.
    // }

    // set witnessesCount to zero
    // tx_new_ptr.add::<u8>(__size_of::<TxScript>() - __size_of::<u16>()).write::<u16>(0);

    // log(raw_slice::from_parts::<u8>(tx_new_ptr, tx_len));
}
