library;

use std::{
    tx::{GTF_WITNESS_DATA, tx_witnesses_count},
    b512::B512,
    bytes::Bytes,
};

use ::{
    webauthn_digest::*,
    recover_signature::*,
    entities::*,
    utilities::*,
    tx_hash::*,
    validations::*
};

pub const PREFIX_BAKO_SIG: [u8; 4] = [66, 65, 75, 79];
pub const MAX_SIGNERS: u64 = 10;


pub enum SignatureType {
    WebAuthn: WebAuthnHeader,
    Fuel: FuelHeader,
    None: (),
}

// pub struct WebAuthnHeader {
//     pub signature: B512,
//     pub prefix_size: u64,
//     pub suffix_size: u64,
//     pub message_data_size: u64,
// }

// pub struct FuelHeader {
//     pub signature: B512,
// }

// recebe o index da assinatura
// verifica se é um prefixo bako
// retorna o tipo de assinatura

// retorno (bool, SignatureType, raw_ptr)
// bool: se é um prefixo bako
// SignatureType: tipo de assinatura 
// raw_ptr: ponteiro para a assinatura 

pub fn get_witness(i: u64) -> (bool, SignatureType, raw_ptr) {
    let mut ptr = __gtf::<raw_ptr>(i, GTF_WITNESS_DATA);

    let from_bako = asm(
        prefix: PREFIX_BAKO_SIG,
        ptr: ptr,
        size: 4,
        r1
    ){
        meq r1 ptr prefix size;
        r1: bool
    };

    if(!from_bako){
        return (
            false,
            SignatureType::None,
            ptr
        )
    };

    ptr = ptr.add_uint_offset(4);
    let signature = ptr.read::<SignatureType>();
    ptr = ptr.add_uint_offset(__size_of::<u64>());

    (from_bako, signature, ptr)
}



// recupera as chaves que assinaram
// no final, remove itens duplicados e inválidos
pub fn recover_witnesses(tx_bytes: Bytes) -> Vec<Address> {

    let mut verified_signatures: Vec<Address> = Vec::with_capacity(MAX_SIGNERS);
    let mut i_witnesses = 0;

    while i_witnesses < tx_witnesses_count() {
        let (from_bako, sig_type, ptr) = get_witness(i_witnesses);

        if !from_bako {
            i_witnesses += 1;
            continue;
        }

        match sig_type {
            SignatureType::WebAuthn(sig_payload) => {
                let data_ptr = ptr.add_uint_offset(__size_of::<WebAuthnHeader>());
                let digest = get_webauthn_digest(sig_payload, data_ptr, tx_bytes);
                let p_key = webauthn_verify(digest, sig_payload);

                verified_signatures.push(p_key);
            },
            SignatureType::Fuel => {
                let digest = ptr.read::<B512>();
                let p_key = fuel_verify(digest, tx_bytes);

                verified_signatures.push(p_key);
            },
            SignatureType::None => {
                continue;
            }
        };
        
        i_witnesses += 1;
    }
 
    verified_signatures
}



// // identifica o UTXO entre as assinaturas -> prefixo de inputx
// pub fn get_witness_utxo_ref() -> b256 {
//     let mut utxo_ref = b256::zero();
//     let mut w_len = tx_witnesses_count();
//     let mut i = 0;

//     while i < w_len {
//         let (from_bako, sig_type, ptr) = get_witness(i);

//         match sig_type {
//             SignatureType::UtxoRef(utxo) => {
//                 utxo_ref = ptr.read::<b256>();
//                 break;
//             },
//             _ => {
//                 i += 1;
//             }
//         }
//     }

//     utxo_ref
// }

// encontra o utxo da tx
// calcula o hash da tx
// recebe um ponteiro e o tipo de assinatura
// verifica se é uma assinatura webauthn
pub fn verify_witnesses(
    required_signers: u64,
    signatories: Vec<Address>,
    utxo: b256,
) -> bool {
    let tx_bytes = b256_to_ascii_bytes(tx_hash(utxo));
    let signers = recover_witnesses(tx_bytes);


    log(utxo);

    // verifica invalidos
    // verifica se existe em signatories
    let valid_signers:u64 = validate_signers(signers, signatories);

    valid_signers >= required_signers
}