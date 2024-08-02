library;

use std::{
    b512::B512,
};

pub enum Signature {
  webauth: WebAuthn,
  fuelsig: FuelSignature,
}

pub struct FuelSignature {
  pub code: u64,
  pub signature: B512,
}

pub struct WebAuthn {
  pub signature: B512,
  pub prefix_size: u64,
  pub suffix_size: u64,
  pub auth_data_size: u64,
  prefix: raw_slice,
  suffix: raw_slice,
  auth_data: raw_slice,
}
