// import { Provider, ScriptTransactionRequest } from 'fuels';
// import { v4 as uuidv4 } from 'uuid';
// import {
//   ITransaction,
//   IFormatTransfer,
//   TransactionStatus,
//   TransactionType,
//   ITransactionResume,
// } from 'bakosafe/src/';

// import {
//   assets,
//   DEFAULT_BALANCES,
//   DEFAULT_MULTI_ASSET_BALANCES,
// } from './assets';

// export const DEFAULT_TRANSACTION_PAYLOAD = (
//   address: string,
//   provider?: Provider,
// ): IFormatTransfer => {
//   return {
//     name: `tx_${uuidv4()}`,
//     assets: DEFAULT_BALANCES.map((balance) => ({
//       assetId: !!provider ? provider.getBaseAssetId() : assets['ETH'],
//       amount: balance.amount.format(),
//       to: address,
//     })),
//   };
// };

// export const DEFAULT_MULTI_ASSET_TRANSACTION_PAYLOAD = (
//   address: string,
//   assetIds?: string[],
// ): IFormatTransfer => {
//   return {
//     name: `tx_${uuidv4()}`,
//     assets: DEFAULT_MULTI_ASSET_BALANCES.filter(
//       (balance) => !assetIds || assetIds.includes(balance.assetId),
//     ).map((balance) => ({
//       assetId: balance.assetId,
//       amount: balance.amount.format(),
//       to: address,
//     })),
//   };
// };

// export const TransactionResume: ITransactionResume[] = [
//   {
//     id: '5aed63d6-3373-44f6-8bbc-b90ccf26a7d6',
//     hash: 'b9ccdaf436622962479449bbf248776bab24597d074a1f270903e8ca950ae480',
//     totalSigners: 3,
//     requiredSigners: 1,
//     predicate: {
//       id: '46cd6c95-b75c-49d9-8fe3-61a8a1364db1',
//       address:
//         '0xb9ccdaf436622962479449bbf248776bab24597d074a1f270903e8ca950ae480',
//     },
//     status: TransactionStatus.AWAIT_REQUIREMENTS,
//     witnesses: [],
//   },
//   {
//     id: 'b55578e5-2b81-45db-9a24-1d8057dd2913',
//     hash: '262531038713234b94236ff9a8e89dd363b592e57edfe1913663f8d2929fd2b8',
//     totalSigners: 5,
//     requiredSigners: 2,
//     predicate: {
//       id: '550f0714-7f56-4e7e-b3bc-ec2857603aaa',
//       address:
//         '0x9765c23dc0f3cc68ea93c38f174b6d55a666daf36293976ca4c9037fbf5931c0',
//     },
//     status: TransactionStatus.AWAIT_REQUIREMENTS,
//     witnesses: [],
//   },
// ];

// export const transactions: ITransaction[] = [
//   {
//     id: '8ce7727a-bce7-4ee2-b408-d6615872242c',
//     name: 'tx_fd1a18ca-074a-4ace-92d7-dbe4cb66bb47',
//     type: TransactionType.TRANSACTION_SCRIPT,
//     resume: TransactionResume[0],
//     hash: '20ee0675d22a22e826bc12df4f9160e73bcead511e71826834fcc720946afe9d',
//     assets: [],
//     txData: new ScriptTransactionRequest(),
//     status: TransactionStatus.AWAIT_REQUIREMENTS,
//     createdAt: '2024-08-07 18:58:21.710000',
//     updatedAt: '2024-08-07 18:58:21.710000',
//   },
//   {
//     id: '8ce7727a-bce7-4ee2-b408-d6615872242c',
//     name: 'tx_fd1a18ca-074a-4ace-92d7-dbe4cb66bb47',
//     type: TransactionType.TRANSACTION_SCRIPT,
//     resume: TransactionResume[0],
//     hash: '20ee0675d22a22e826bc12df4f9160e73bcead511e71826834fcc720946afe9d',
//     assets: [],
//     txData: new ScriptTransactionRequest(),
//     status: TransactionStatus.AWAIT_REQUIREMENTS,
//     createdAt: '2024-08-07 18:58:21.710000',
//     updatedAt: '2024-08-07 18:58:21.710000',
//   },
// ];
