/* Autogenerated file. Do not edit manually. */

/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/consistent-type-imports */

/*
  Fuels version: 0.96.1
  Forc version: 0.65.2
  Fuel-Core version: 0.38.0
*/

import {
  BigNumberish,
  BN,
  decompressBytecode,
  InputValue,
  Predicate,
  PredicateParams,
  Provider,
} from 'fuels';

export type BakoPredicateConfigurables = Partial<{
    SIGNERS: [string, string, string, string, string, string, string, string, string, string];
    SIGNATURES_COUNT: BigNumberish;
    HASH_PREDICATE: string;
}>;

export type BakoPredicateInputs = [];

export type BakoPredicateParameters = Omit<
  PredicateParams<BakoPredicateInputs, BakoPredicateConfigurables>,
  'abi' | 'bytecode'
>;

const abi = {
  "programType": "predicate",
  "specVersion": "1",
  "encodingVersion": "1",
  "concreteTypes": [
    {
      "type": "[b256; 10]",
      "concreteTypeId": "048b86a7fa6d593a3b17384eeb42370b18126ce11ea29e4d60f7a6c2a507b88d",
      "metadataTypeId": 0
    },
    {
      "type": "b256",
      "concreteTypeId": "7c5ee1cecf5f8eacd1284feb5f0bf2bdea533a51e2f0c9aabe9236d335989f3b"
    },
    {
      "type": "bool",
      "concreteTypeId": "b760f44fa5965c2474a3b471467a22c43185152129295af588b022ae50b50903"
    },
    {
      "type": "u64",
      "concreteTypeId": "1506e6f44c1d6291cdf46395a8e573276a4fa79e8ace3fc891e092ef32d1b0a0"
    }
  ],
  "metadataTypes": [
    {
      "type": "[_; 10]",
      "metadataTypeId": 0,
      "components": [
        {
          "name": "__array_element",
          "typeId": "7c5ee1cecf5f8eacd1284feb5f0bf2bdea533a51e2f0c9aabe9236d335989f3b"
        }
      ]
    }
  ],
  "functions": [
    {
      "inputs": [],
      "name": "main",
      "output": "b760f44fa5965c2474a3b471467a22c43185152129295af588b022ae50b50903",
      "attributes": null
    }
  ],
  "loggedTypes": [],
  "messagesTypes": [],
  "configurables": [
    {
      "name": "SIGNERS",
      "concreteTypeId": "048b86a7fa6d593a3b17384eeb42370b18126ce11ea29e4d60f7a6c2a507b88d",
      "offset": 8248
    },
    {
      "name": "SIGNATURES_COUNT",
      "concreteTypeId": "1506e6f44c1d6291cdf46395a8e573276a4fa79e8ace3fc891e092ef32d1b0a0",
      "offset": 8240
    },
    {
      "name": "HASH_PREDICATE",
      "concreteTypeId": "7c5ee1cecf5f8eacd1284feb5f0bf2bdea533a51e2f0c9aabe9236d335989f3b",
      "offset": 8208
    }
  ]
};

const bytecode = decompressBytecode('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');

export class BakoPredicate extends Predicate<
  BakoPredicateInputs,
  BakoPredicateConfigurables
> {
  static readonly abi = abi;
  static readonly bytecode = bytecode;

  constructor(params: BakoPredicateParameters) {
    super({ abi, bytecode, ...params });
  }
}