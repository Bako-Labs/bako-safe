// import {
//   ICreateTransactionPayload,
//   ITransaction,
//   TransactionStatus,
//   TransactionType,
// } from 'bakosafe/src';
// import { randomUUID } from 'crypto';
// import { TransactionResume, transactions } from '../transactions';
// import { Address } from 'fuels';

// class TransactionStorage {
//   private transactions: ITransaction[] = [...transactions];

//   public publish(transaction: ITransaction) {
//     this.transactions.push(transaction);
//   }

//   public findByHash(_hash: string) {
//     const transaction = this.transactions.find(({ hash }) => hash === _hash);
//     if (!transaction) {
//       throw new Error('Transaction not found');
//     }

//     return transaction;
//   }

//   public findById(id: string) {
//     const transaction = this.transactions.find(
//       ({ id: transactionId }) => transactionId === id,
//     );
//     if (!transaction) {
//       throw new Error('Transaction not found');
//     }

//     return transaction;
//   }

//   public clear() {
//     this.transactions = [];
//   }

//   public restore() {
//     this.transactions = [...transactions];
//   }
// }

// export const mockTransactionService = {
//   create: jest.fn<Promise<ITransaction>, [ICreateTransactionPayload]>(),
//   findByHash: jest.fn<Promise<ITransaction>, [string]>(),
//   findByTransactionID: jest.fn<Promise<ITransaction>, [string]>(),
//   sign: jest.fn<Promise<ITransaction>, [string, string, string, boolean?]>(),
//   send: jest.fn<Promise<ITransaction>, [string]>(),
//   verify: jest.fn<Promise<ITransaction>, [string]>(),
//   status: jest.fn<Promise<ITransaction>, [string]>(),
//   // storage
//   store: new TransactionStorage(),
// };

// // Implementação dos mocks utilizando os parâmetros da request:
// mockTransactionService.create.mockImplementation(
//   (payload: ICreateTransactionPayload) => {
//     return new Promise((resolve, _) => {
//       const transaction: ITransaction = {
//         ...payload,
//         id: randomUUID(),
//         name: `tx_${randomUUID()}`,
//         hash: Address.fromRandom().toString(),
//         createdAt: new Date().toISOString(),
//         updatedAt: new Date().toISOString(),
//         status: TransactionStatus.AWAIT_REQUIREMENTS,
//         type: TransactionType.TRANSACTION_SCRIPT,
//         resume: TransactionResume[0],
//       };
//       mockTransactionService.store.publish(transaction);
//       resolve(transaction);
//     });
//   },
// );

// mockTransactionService.findByHash.mockImplementation((hash: string) => {
//   return new Promise((resolve, _) => {
//     resolve(mockTransactionService.store.findByHash(hash));
//   });
// });

// mockTransactionService.findByTransactionID.mockImplementation(
//   (transactionId: string) => {
//     return new Promise((resolve, _) => {
//       resolve(mockTransactionService.store.findById(transactionId));
//     });
//   },
// );

// mockTransactionService.sign.mockImplementation(
//   (
//     BakoSafeTransactionId: string,
//     account: string,
//     signer: string,
//     approve: boolean = true,
//   ) => {
//     return new Promise((resolve, _) => {
//       const transaction = mockTransactionService.store.findById(
//         BakoSafeTransactionId,
//       );
//       transaction.status = approve
//         ? TransactionStatus.SUCCESS
//         : TransactionStatus.FAILED;
//       resolve(transaction);
//     });
//   },
// );

// mockTransactionService.send.mockImplementation(
//   (BakoSafeTransactionId: string) => {
//     return new Promise((resolve, _) => {
//       const transaction = mockTransactionService.store.findById(
//         BakoSafeTransactionId,
//       );
//       transaction.status = TransactionStatus.PROCESS_ON_CHAIN;
//       resolve(transaction);
//     });
//   },
// );

// mockTransactionService.verify.mockImplementation(
//   (BakoSafeTransactionId: string) => {
//     return new Promise((resolve, _) => {
//       const transaction = mockTransactionService.store.findById(
//         BakoSafeTransactionId,
//       );
//       transaction.status = TransactionStatus.SUCCESS;
//       resolve(transaction);
//     });
//   },
// );

// mockTransactionService.status.mockImplementation(
//   (BakoSafeTransactionId: string) => {
//     return new Promise((resolve, _) => {
//       resolve(mockTransactionService.store.findById(BakoSafeTransactionId));
//     });
//   },
// );

// export default mockTransactionService;
