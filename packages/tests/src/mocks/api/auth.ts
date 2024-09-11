import { jest } from '@jest/globals';
import { Service } from '../../../../sdk/src/modules/service'; // Ajuste o caminho conforme necessário

// Mock do Axios
jest.mock('axios');

// Cria o mock da classe `Service`
const mockService = jest.fn();

// Implementação do mock de `Service`
mockService.mockImplementation(() => ({
  // Mock do Axios API (com interceptores e métodos HTTP)
  api: {
    interceptors: {
      request: {
        use: jest.fn(), // Mock do interceptor
      },
    },
    get: jest.fn(), // Mock dos métodos HTTP do Axios
    post: jest.fn(),
    put: jest.fn(),
  },

  create: jest.fn().mockImplementation(() => {
    return { code: 'mocked_challenge' };
  }),

  // Mock dos métodos da classe Service
  getWorkspaces: jest.fn().mockImplementation(() => {
    return [
      { workspace: 'mocked_workspace_1' },
      { workspace: 'mocked_workspace_2' },
    ];
  }),

  // getToken: jest
  //   .fn()
  //   .mockResolvedValue([
  //     { token: 'mocked_token_1' },
  //     { token: 'mocked_token_2' },
  //   ]),

  // createPredicate: jest.fn().mockResolvedValue({
  //   predicateAddress: 'mocked_predicate_address',
  // }),

  // findByAddress: jest.fn().mockResolvedValue({
  //   predicateAddress: 'mocked_predicate_address',
  // }),

  // createTransaction: jest.fn().mockResolvedValue({
  //   transactionId: 'mocked_transaction_id',
  // }),

  // findTransactionByHash: jest.fn().mockResolvedValue({
  //   txData: 'mocked_transaction_data',
  // }),

  // signTransaction: jest.fn().mockResolvedValue({
  //   hash: 'mocked_transaction_hash',
  //   signature: 'mocked_signature',
  // }),

  // sendTransaction: jest.fn().mockResolvedValue({
  //   result: 'transaction_sent',
  // }),

  // // Métodos estáticos
  // static: {
  //   create: jest.fn().mockResolvedValue({
  //     userId: 'mocked_user_id',
  //     address: 'mocked_address',
  //   }),

  //   sign: jest.fn().mockResolvedValue({
  //     accessToken: 'mocked_access_token',
  //   }),
  // },
}));

// Mock completo do Service aplicado
jest.mock('../../../../sdk/src/modules/service', () => ({
  Service: mockService,
}));

export default Service;
