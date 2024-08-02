script;

use std::{
    tx::{
        tx_witness_data,
        tx_witnesses_count,
        tx_id,
        GTF_WITNESS_DATA,
    },
    bytes::Bytes,
    ecr::{
        ec_recover_address,
    },
    hash::*,
};

use libraries::{
    ascii::b256_to_ascii_bytes,
    recover_signature::{
        fuel_verify, 
        webauthn_verify,
    },
    webauthn_digest::{
      get_webauthn_digest, 
    },
    entities::{
        WebAuthn,
        Signature,
    },
    validations::{
        check_signer_exists,
        check_duplicated_signers,
    },
    constants::{
        MAX_SIGNERS,
        EMPTY_SIGNERS,
        INVALID_ADDRESS,
        BYTE_WITNESS_TYPE_FUEL,
        BYTE_WITNESS_TYPE_WEBAUTHN,
    }
};

use std::b512::{B512};

struct WebAuthnHeader {
  pub signature: B512,
  pub prefix_size: u64,
  pub suffix_size: u64,
  pub auth_data_size: u64,
}

struct WebAuthnPaylod {
    pub prefix: Bytes,
    pub suffix: Bytes,
    pub auth_data: Bytes,
}

enum SignatureType {
  WebAuthn: WebAuthnHeader,
  Fuel: B512,
}

fn main() {
    // const WEBAUTHN_TX_ID =0x361928fde57834469c1f2d9bbf858cda73d431e6b1b04149d6836a7c2e890410;
    // const WEBAUTHN_ADDRESS = 0x9962da540401d92e1d06a61a0a41428f64cadf5d821b2f7f51b9c18dfdc7d2e2;

    // let mut i_witnesses = 0;
    // let tx_bytes = b256_to_ascii_bytes(WEBAUTHN_TX_ID);
    
    // while i_witnesses < tx_witnesses_count() {
        
        // .read::<u64>();
                // pub fn tx_witness_data<T>(index: u64) -> T {
                //     if __size_of::<T>() == 1 {
                //         __gtf::<raw_ptr>(index, GTF_WITNESS_DATA).add::<u8>(7).read::<T>()
                //     } else {
                //         __gtf::<raw_ptr>(index, GTF_WITNESS_DATA).read::<T>()
                //     }
                // }
                

            let raw_ptr = __gtf::<raw_ptr>(0, GTF_WITNESS_DATA);
            let signature = raw_ptr.read::<SignatureType>();
            match signature {
                SignatureType::WebAuthn(webauthn) => {
                    // log(webauthn.signature);
                    // log(webauthn.prefix_size);
                    // log(webauthn.suffix_size);
                    // log(webauthn.auth_data_size);
                    // enum + header
                    
                    let size_header = __size_of::<u64>() + __size_of::<WebAuthnHeader>();
                    let data_ptr = raw_ptr.add::<u8>(size_header);
                    let data_len = webauthn.prefix_size + __size_of::<b256>() + webauthn.suffix_size + webauthn.auth_data_size;

                    let mut a = Bytes::new();
                    a.push(1u8);
                    a.push(2u8);
                    a.push(3u8);
                
                    // let data_buf = Bytes::from(raw_slice::from_parts::<u8>(data_ptr, data_len));
                    
                    let data_buf_ptr = __addr_of(a);
                    let tx_buf = Bytes::from(raw_slice::from_parts::<u8>(data_buf_ptr, 3));

                    log(a);
                    log(tx_buf);
                    
                    // let tx_id = tx_id();
                    // let tx_id_ptr = asm(r1: tx_id) {
                    //     r1: raw_ptr
                    // };

                    // asm (tx_src: tx_id_ptr, tx_pt: tx_ptr, len: 32u8) {
                    //     mcp tx_pt tx_src len;
                    // };

                    // let data_buf2 = Bytes::from(raw_slice::from_parts::<u8>(data_ptr, data_len));
                    // log(data_buf2);

                    // let prefix_bytes = Bytes::from(prefix_buf);

                    // log(prefix_bytes);
                    // log(prefix_bytes.get)

                    // let suffix_buf = raw_slice::from_parts::<u8>(ptr2, );
                    // let suffix_bytes = Bytes::from(prefix_buf);

                    // raw_slice
                    
                    // let mut bytes = Bytes::new();
                    // // sha256 (
                   
                    //     // sha256 (
                    //     bytes.append(prefix_bytes);
                    //     -->> bytes.append(0x0000000000000000000000000000000000000000000000000000000000000000); // -> ptr_tx
                    //     bytes.append(suffix_bytes); ///
                    //     bytes.append(auth_data); // ptr_auth
                    //     // )
                    // // )

                    // asm(ptr) {
                    //     write tx_id
                    //     alloc
                    //     sha256 a ptr ptr + auth_data_offset
                    //     sha256 ptr ptr_auth  + auth_data_offset
                    // }

                    // // raw_ptr.write::<b256>(0, value);

                    // // webauthn.prefix_size
                    // // bytes..

                    // log(bytes);
                    

                    // asm(prefix: (ptr2, webauthn.prefix_size), suffix: (ptr2, webauthn.suffix_size)) {
                    //     ptr: raw_slice
                    // }
                    
                    // (raw_ptr, u64)
                    // (ptr, __mul(count, __size_of::<T>()))
                    // let hash = asm () {
                    //     aloc 
                    //     lb
                    //     lb
                        
                    //     read $prefix_bytes
                    //     read $suffix_bytes
                    //     write $prefix_bytes $tx_id $suffix_bytes
                    //     sha256
                    // };
                    
                    
                    // --> DATA
                    
                    // let ass = ptr2.read::<raw_slice>();
                    // Bytes::from(a)
                    // let prefix = Vec::<u8>::from();
                    // ptr.add::<u64>(webauthn.prefix_size);
                    // let b = raw_slice::from_parts::<u8>(ptr, webauthn.suffix_size);
                    // let suffix = Vec::<u8>::from(Bytes::from(b));
                    // ptr.add::<u64>(webauthn.suffix_size);
                    // let c = raw_slice::from_parts::<u8>(ptr, webauthn.auth_data_size);
                    // let auth_data = Vec::<u8>::from(Bytes::from(c));
                    // let payload = WebAuthnPaylod {
                    //     prefix,
                    //     suffix,
                    //     auth_data,
                    // };

                    // log(a);
                    // match prefix.get(0) {
                    //     Some(value) => log(value),
                    //     None => (),
                    // }
                    // let value: u8 = .unwrap();
                    // log(value);
                    // webauthn.prefix_size + webauthn.suffix_size + webauthn.auth_data_size;
                    // let vec: Vec<u64> = Vec::from(webauthn.data);
                    // log(vec);
                    // log();
                },
                _ => {
                    
                },
            };
            // match  {
            //     _ => {
            //         // log(__gtf::<raw_ptr>(i_witnesses, GTF_WITNESS_DATA).read::<u64>()); // enum
            //         // log(__gtf::<raw_ptr>(i_witnesses, GTF_WITNESS_DATA).add::<u8>(__size_of::<u64>()).read::<B512>()); // signature
            //         // log(__gtf::<raw_ptr>(i_witnesses, GTF_WITNESS_DATA).add::<u8>(__size_of::<u64>()).add::<u8>(__size_of::<B512>()).read::<u64>()); // prefix_size
            //         // log(__gtf::<raw_ptr>(i_witnesses, GTF_WITNESS_DATA).add::<u8>(__size_of::<u64>()).add::<u8>(__size_of::<B512>()).add::<u8>(__size_of::<u64>()).read::<u64>()); // suffix_size
            //         // log(__gtf::<raw_ptr>(i_witnesses, GTF_WITNESS_DATA).add::<u8>(__size_of::<u64>()).add::<u8>(__size_of::<B512>()).add::<u8>(__size_of::<u64>()).add::<u8>(__size_of::<u64>()).read::<u64>()); // auth_data_size
            //     },
            // };

        // i_witnesses += 1;
    // }
}