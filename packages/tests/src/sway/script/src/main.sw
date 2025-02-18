script;


//----------------------------------------------------------------------------------------------------- ideia 2:
// etapas:
    // 1. pegue todo o bytecode da tx -- referencia em tx.sw do std, fn tx_witnesses_data
        // 1.1. pege o tamanho da tx, use o constante GTF_TX_LENGTH -> Some(__gtf::<u64>(index GTF_WITNESS_DATA_LENGTH))
        // 1.2. copie a tx inteira para uma nova variavel
            // 1.2.1. leia como um ponteiro -> 
    // 2. remova todos os inputs do tipo coin --- contract-call nao influencia aqui
        // 2.1. pegue todo o pedaco antes
        // 2.2. pegue todo o pedaco depois
        // 2.3 concatene os dois
        // 2.4 devolva
    // 3. com o bytecode sem inputs
        // 3.1 procure pelo input com asset_id equivalenda a AssetId::new(ContractId, predicate_address)
        // 3.2 concatene novamente toda a info desse input ao fim do bytecode


// ts:utxo -> sw:sha256(tx_id as byte[32], output_index)


// assina sobre o utxo do input especifico

use std::tx::{GTF_TX_LENGTH, GTF_TYPE, GTF_POLICY_MAX_FEE, GTF_SCRIPT_INPUTS_COUNT};
use std::b512::B512;
use std::alloc::alloc_bytes;
use std::hash::Hasher;


pub struct Tx {
    tx_id: b256,
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


    log(tx_start.read::<B512>());

    return 12
    

}

//------------------------------------------------------------------------------------------------------
// ideia 1: -> 
// problema: 
//          qualquer pessoa pode drenar os valores de eth em fees
//          qualquer pessoa pode inviabilizar o vault, gerando muitos utxos pequenos
// 

// quando uma criacao de tx é solicitada:

// voce executa uma tx do predicate para ele mesmo, com os input coins fracionados
// o objetivo é ter utxos certos para seguir com a proxima

// adicione um witnesses nas 1as posicoes, para indicar que esta é apenas para splitar o utxo

// caso o witnesses seja identificado, cai em uma lógica de verificacao:
// 1. pega o address do predicate
// 2. verifica se todos os outputs sao para o mesmo address

// validacoes:

// - enviar uma tx para voce mesmo, com apenas ETH:
//https://app-testnet.fuel.network/tx/0x774c2225d5dbdd688393d7a7f2239635067084d49a1b8ae02e8c6fd4cdabb19c/advanced

// - enviar uma tx para voce mesmo, com um token + ETH(fee):
//https://app-testnet.fuel.network/tx/0x2f2a7fb374a1f3fdab83586d73ed3ad8bc18c732deece06162ee0085143880ac/advanced







    // get all bytes from tx
    // populate new_tx with all bytes from tx

        // get tx length
        // let tx_len = match Some(__gtf::<u64>(0, GTF_TX_LENGTH)) {
        //     Some(len) => len,
        //     None => return false,
        // };


        // let mut tx_start:u64 = 0;

        // // get tx ptr
        // asm (
        //     tx_start: tx_start
        // ) {
        //     gm tx_start 0x00005;
        // };




        // let mut new_tx = alloc_bytes(tx_len);

        // let ptr = 0x00005;


        // const GM_TX_START = 0x00005;
        // const GM_TX_END = 0x00005 + TX_LEN;
        // // allocate new tx
        // let new_tx = alloc_bytes(TX_LEN);

        // // get 
        // let tx_ptr = __gtf::<raw_ptr>(0, GM_TX_END);
        // tx_ptr.copy_bytes_to(new_tx, TX_LEN);


        // // 

        // // get 1st 8 bytes
        // let start_bytes = tx_ptr.read::<Tx>();

        // log(start_bytes.tx_id);

        