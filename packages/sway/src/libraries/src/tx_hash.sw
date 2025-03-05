library;

use std::{
    inputs::*,
    outputs::*,
    hash::*,
    tx::*,
    auth::predicate_address,
    bytes::*,
    alloc::*,
};

use ::utilities::{get_tx_ptr, b256_to_ascii_bytes};

pub struct TxScriptHeader {
    _type: u8,
    _scriptGasLimit: u64,
    _receiptsRoot: b256,
    _scriptLength: u64,
    _scriptDataLength: u64,
    _policyTypes: u64,
    _inputsCount: u16,
    _outputsCount: u16,
    _witnessesCount: u16,
}

pub struct Utxo {
    _txID: b256,
    _outputIndex: u16,
}

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

pub struct OutputCoin {
    _to: b256,
    _amount: u64,
    _assetId: b256,
}

pub struct OutputContract {
    _inputIndex: u16,
    _balanceRoot: b256,
    _stateRoot: b256,
}

pub struct OutputChange {
    _to: b256,
    _amount: u64,
    _assetId: b256,
}

pub struct OutputVariable {
    _to: b256,
    _amount: u64,
    _assetId: b256,
}

pub struct OutputContractCreated {
    _contractID: b256,
    _stateRoot: b256,
}

pub fn tx_hash(input_utxo: b256) {
    let (tx_ptr, tx_len) = get_tx_ptr();
    let tx_new_ptr = alloc::<u8>(tx_len);
    let tx_type = tx_type();
    let mut utxo_sha256: b256 = b256::zero();


    // Copy first part
    tx_ptr.copy_bytes_to(tx_new_ptr, __size_of::<TxScriptHeader>());

    match tx_type {
        Transaction::Script => {
            let tx_script_lengths = tx_new_ptr.read::<TxScriptHeader>();
            let mut current_index = __size_of::<TxScriptHeader>() - __size_of::<(u16, u16, u16, u64)>();

            // policy
            tx_ptr.add::<u8>(current_index).copy_bytes_to(
                tx_new_ptr.add::<u8>(current_index),
                __size_of::<u64>()
            );
            current_index += __size_of::<u64>();

            // inputs count -> only 0
            tx_new_ptr.add::<u8>(current_index).write::<u16>(0);
            current_index += __size_of::<u16>();


            // outputs count
            tx_ptr.add::<u8>(current_index).copy_bytes_to(
                tx_new_ptr.add::<u8>(current_index),
                __size_of::<u16>()
            );
            current_index += __size_of::<u16>();

            // witnesses count -> only 0
            tx_new_ptr.add::<u8>(current_index).write::<u16>(0);
            current_index += __size_of::<u16>();

            // script
            tx_ptr.add::<u8>(current_index).copy_bytes_to(
                tx_new_ptr.add::<u8>(current_index),
                tx_script_lengths._scriptLength
            );
            current_index += tx_script_lengths._scriptLength;

            // script data
            tx_ptr.add::<u8>(current_index).copy_bytes_to(
                tx_new_ptr.add::<u8>(current_index),
                tx_script_lengths._scriptDataLength
            );
            current_index += tx_script_lengths._scriptDataLength;

            // tx policy
            // we assumed that the policy is maxfee policy
            tx_ptr.add::<u8>(current_index).copy_bytes_to(
                tx_new_ptr.add::<u8>(current_index),
                tx_script_lengths._policyTypes
            );
            current_index += tx_script_lengths._policyTypes;

            // process inputs
            let mut inputs_index:u16 = 0;
            let mut inputs_iter_len:u64 = 0;
            while inputs_index < tx_script_lengths._inputsCount {
                let input_type = tx_ptr.add::<u8>(
                    current_index + inputs_iter_len
                ).read::<Input>();
                inputs_iter_len = __size_of::<Input>();
                
                match input_type {
                    Input::Coin => {
                        let input: InputCoin = tx_ptr.add::<u8>(
                            current_index + inputs_iter_len
                        ).read::<InputCoin>();
                        if input._assetId == input_utxo {
                            let utxo_ptr = alloc::<u8>(__size_of::<Utxo>());
                            let utxo_len = __size_of::<Utxo>();
                            utxo_ptr.add::<u8>(0).write::<b256>(input._txID);
                            utxo_ptr.add::<u8>(__size_of::<b256>()).write::<u16>(input._outputIndex);
                            
                            asm(
                                utxo_ptr: utxo_ptr, 
                                utxo_len: utxo_len, 
                                r1: utxo_sha256
                            ) {
                                s256 r1 utxo_ptr utxo_len;
                            };

                        }
                        let predicate_len = input._predicateLength + input._predicateDataLength;
                        inputs_iter_len += __size_of::<InputCoin>() + predicate_len;
                    },
                    Input::Message => {
                        let input = tx_ptr.add::<u8>(
                            current_index + inputs_iter_len
                        ).read::<InputMessage>();

                        let predicate_len = input._predicateLength + input._predicateDataLength + input._dataLength;
                        inputs_iter_len += __size_of::<InputMessage>() + predicate_len;
                    },
                    Input::Contract => {
                        let input = tx_ptr.add::<u8>(
                            current_index + inputs_iter_len
                        ).read::<InputContract>();
                        
                        inputs_iter_len += __size_of::<InputContract>();
                    }
                }

                inputs_index += 1;
            }
            

            // move tx pointer to the end of inputs
            current_index += inputs_iter_len;

            // outputs
            let mut output_index: u16 = 0;
            while output_index < tx_script_lengths._outputsCount {
                // read output type
                let output_type = tx_ptr.add::<u8>(current_index).read::<Output>();
                
                // copy output type to new tx
                tx_ptr.add::<u8>(current_index)
                .copy_bytes_to(tx_new_ptr.add::<u8>(current_index - inputs_iter_len), __size_of::<Output>());
                current_index = current_index + __size_of::<Output>();
                
                let ptr_ref = current_index - inputs_iter_len;
                match output_type {
                    Output::Coin => {
                        let size = __size_of::<OutputCoin>();
                        
                        tx_ptr.add::<u8>(current_index)
                        .copy_bytes_to(tx_new_ptr.add::<u8>(ptr_ref), size);
                        
                        current_index = current_index + size;
                    },
                    Output::Contract => {
                        let size = __size_of::<OutputContract>();
                        
                        tx_ptr.add::<u8>(current_index)
                        .copy_bytes_to(tx_new_ptr.add::<u8>(ptr_ref), size);
                        
                        current_index = current_index + size;
                        
                    },
                    Output::Change => {
                        let size = __size_of::<OutputChange>();
                        
                        tx_ptr.add::<u8>(current_index)
                        .copy_bytes_to(tx_new_ptr.add::<u8>(ptr_ref), size);
                        
                        current_index = current_index + size;
                        
                        
                    },
                    Output::Variable => {
                        let size = __size_of::<OutputVariable>();

                        tx_ptr.add::<u8>(current_index)
                        .copy_bytes_to(tx_new_ptr.add::<u8>(ptr_ref), size);

                        current_index = current_index + size;
                        
                    },
                    Output::ContractCreated => {
                        let size = __size_of::<OutputContractCreated>();

                        tx_ptr.add::<u8>(current_index)
                        .copy_bytes_to(tx_new_ptr.add::<u8>(ptr_ref),size);

                        current_index = current_index +size;
                        
                    },
                }
                output_index += 1;
            }

            let mut new_tx_len = current_index - inputs_iter_len;

            // utxo
            tx_new_ptr.add::<u8>(
                new_tx_len
            ).write::<b256>(utxo_sha256);
            new_tx_len += __size_of::<b256>();

            let mut tx_hash = b256::zero();
            asm(
                value: tx_new_ptr,
                size: new_tx_len,
                r1: tx_hash
            ) {
                s256 r1 value size;
            }

            log(tx_hash);

        },
        _ => {
            log(0);
        }
    };

}