import { IPredicate } from 'bakosafe/src/api';
import {
  findPredicateVersionByCode,
  predicateCurrentVersion,
} from './predicateVersions';
import { workspace } from './workspaces';

export const configurable = {
  PREDICATE_1:
    '{"SIGNATURES_COUNT":1,"SIGNERS":["0xb7ad0a1344eb35fe0f5c934d181d8ab222dea02acb69c6408445e516fe9809eb","0xb47f4b4e139a84d984a2c6a1fdb48892583ad144d0e5dfac95bec673f1a89208","0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000000"],"HASH_PREDICATE":"0x0525c7d8410c5fec181de6f7ab4334e6f0a667d86a5f55c25e560b8228954ee4","network":"https://testnet.fuel.network/v1/graphql","chainId":0}',
  PREDICATE_2:
    '{"SIGNATURES_COUNT":3,"SIGNERS":["0x765c373629fe7825854be7ce3a00c435d4548d0b2b7b60a94075aff5e1397b02","0x5422402e243ad8234254ad3d81d1e56778aaa1acd86f97b2aa8eacb5546b1f0f","0xbe5044b53cb8780de0d179c77ec4f9db096aaf89259f42e568802dff5559ab23","0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000000"],"HASH_PREDICATE":"0xbeba2cb8f1769c20bafc6773e6af2692a8486b0b30ac22235dbd6d496cdb6002","network":"https://testnet.fuel.network/v1/graphql","chainId":0}',
};

const members = {
  PREDICATE_1: [
    {
      id: '0fec3a23-cb9f-4f86-92b1-cd49413b7284',
      avatar: 'https://besafe-asset.s3.amazonaws.com/icon/users/540.jpg',
      address:
        '0xb7ad0a1344eb35fe0f5c934d181d8ab222dea02acb69c6408445e516fe9809eb',
    },
    {
      id: '578e55c3-b877-4e1f-9586-1e7d7105cfd3',
      avatar: 'https://besafe-asset.s3.amazonaws.com/icon/users/539.jpg',
      address:
        '0xb47f4b4e139a84d984a2c6a1fdb48892583ad144d0e5dfac95bec673f1a89208',
    },
  ],
  PREDICATE_2: [
    {
      id: '0fec3a23-cb9f-4f86-92b1-cd49413b7284',
      avatar: 'https://besafe-asset.s3.amazonaws.com/icon/users/540.jpg',
      address:
        '0x765c373629fe7825854be7ce3a00c435d4548d0b2b7b60a94075aff5e1397b02',
    },
    {
      id: '578e55c3-b877-4e1f-9586-1e7d7105cfd3',
      avatar: 'https://besafe-asset.s3.amazonaws.com/icon/users/539.jpg',
      address:
        '0x5422402e243ad8234254ad3d81d1e56778aaa1acd86f97b2aa8eacb5546b1f0f',
    },
    {
      id: '578e55c3-b877-4e1f-9586-1e7d7105cfd3',
      avatar: 'https://besafe-asset.s3.amazonaws.com/icon/users/535.jpg',
      address:
        '0xbe5044b53cb8780de0d179c77ec4f9db096aaf89259f42e568802dff5559ab23',
    },
  ],
};

const address = {
  PREDICATE_1:
    '0x3f6d5ebed4e284aea4e6ad1f5b7421e36f8f5914ea3d5e6ee2f3cd32bf3333f5',
  PREDICATE_2:
    '0x8b1a8a1c595c88cba5d4432e8eeb82f828e336428e4eb0acf5e61c4c721c725b',
};

export const predicates: { [key: string]: IPredicate } = {
  // PREDICATE_1
  PREDICATE_1: {
    id: '795276df-ee33-477d-86d1-305561c23284',
    name: 'Predicate 1',
    description: 'Description for Predicate 1',
    predicateAddress: address['PREDICATE_1'],
    versionCode: predicateCurrentVersion,
    version: findPredicateVersionByCode(predicateCurrentVersion),
    members: members['PREDICATE_1'],
    owner: members['PREDICATE_1'][0],
    minSigners: JSON.parse(configurable['PREDICATE_1']).SIGNATURES_COUNT,
    configurable: configurable['PREDICATE_1'],
    provider: JSON.parse(configurable['PREDICATE_1']).network,
    workspace: workspace['WORKSPACE_4'],
    createdAt: '2024-08-06 10:33:15.146000',
    updatedAt: '2024-08-06 10:33:15.146000',
  },

  // PREDICATE_2
  PREDICATE_2: {
    id: 'e70b7f5e-7809-4155-8161-a19b5714f694',
    name: 'Predicate 2',
    description: 'Description for Predicate 2',
    predicateAddress: address['PREDICATE_2'],
    versionCode: predicateCurrentVersion,
    version: findPredicateVersionByCode(predicateCurrentVersion),
    members: members['PREDICATE_2'],
    owner: members['PREDICATE_2'][0],
    minSigners: JSON.parse(configurable['PREDICATE_2']).SIGNATURES_COUNT,
    configurable: configurable['PREDICATE_2'],
    provider: JSON.parse(configurable['PREDICATE_2']).network,
    workspace: workspace['WORKSPACE_3'],
    createdAt: '2024-08-06 10:33:15.146000',
    updatedAt: '2024-08-06 10:33:15.146000',
  },
};

export type IPredicateKeys = keyof typeof predicates;

// export const findPredicateById = (id: string): IPredicate => {
//   const keys = Object.keys(predicates) as IPredicateKeys[];
//   const key = keys.find((k) => predicates[k].id === id);
//   if (key) {
//     return predicates[key];
//   } else {
//     throw new Error('Predicate not found');
//   }
// };

// export const findPredicateByAddress = (
//   predicateAddress: string,
// ): IPredicate => {
//   const keys = Object.keys(predicates) as IPredicateKeys[];
//   const key = keys.find(
//     (k) => predicates[k].predicateAddress === predicateAddress,
//   );
//   if (key) {
//     return predicates[key];
//   } else {
//     throw new Error('Predicate not found');
//   }
// };
