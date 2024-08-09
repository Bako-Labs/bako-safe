import {
  IPredicateVersion,
  GetPredicateVersionParams,
  IPredicatePayload,
  GetTransactionParams,
  ITransaction,
  IPagination,
  IPredicate,
} from 'bakosafe/src/api';
import { randomUUID } from 'crypto';
import { workspace } from '../workspaces';
import {
  findPredicateVersionByCode,
  predicateCurrentVersion,
  predicateVersions,
} from '../predicateVersions';
import { random_user_avatar } from '../avatars';
import { findPredicateByAddress, findPredicateById } from '../predicates';

export const mockPredicateService = {
  create: jest.fn<Promise<IPredicate>, [IPredicatePayload]>(),
  findByAddress: jest.fn<Promise<IPredicate>, [string]>(),
  findById: jest.fn<Promise<IPredicate>, [string]>(),
  hasReservedCoins: jest.fn<Promise<boolean>, [string]>(),
  listPredicateTransactions: jest.fn<
    Promise<IPagination<ITransaction>>,
    [GetTransactionParams]
  >(),
  findVersionByCode: jest.fn<Promise<IPredicateVersion>, [string]>(),
  findCurrentVersion: jest.fn<Promise<IPredicateVersion>, []>(),
  listVersions: jest.fn<
    Promise<IPagination<IPredicateVersion>>,
    [GetPredicateVersionParams]
  >(),
};

// Implementação dos mocks utilizando os parâmetros da request:
mockPredicateService.create.mockImplementation((payload: IPredicatePayload) => {
  return new Promise((resolve, _) => {
    resolve({
      ...payload,
      id: randomUUID(),
      members: payload.addresses.map((item) => {
        return {
          id: randomUUID(),
          avatar: random_user_avatar(),
          address: item,
        };
      }),
      owner: {
        id: randomUUID(),
        avatar: random_user_avatar(),
        address: payload.addresses[0],
      },
      version: findPredicateVersionByCode(
        payload.versionCode ?? predicateCurrentVersion,
      ),
      workspace: workspace['WORKSPACE_1'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });
});

mockPredicateService.findByAddress.mockImplementation(
  (predicateAddress: string) => {
    return new Promise((resolve, _) => {
      resolve(findPredicateByAddress(predicateAddress));
    });
  },
);

mockPredicateService.findById.mockImplementation((predicateId: string) => {
  return new Promise((resolve, _) => {
    resolve(findPredicateById(predicateId));
  });
});

mockPredicateService.hasReservedCoins.mockImplementation(
  (predicateAddress: string) => {
    return Promise.resolve(false);
  },
);

mockPredicateService.listPredicateTransactions.mockImplementation(
  (params: GetTransactionParams) => {
    return new Promise((resolve, _) => {
      resolve({
        data: [],
        nextPage: 0,
        prevPage: 0,
        currentPage: 1,
        total: 0,
        perPage: 10,
        totalPages: 0,
      });
    });
  },
);

mockPredicateService.findVersionByCode.mockImplementation((code: string) => {
  return new Promise((resolve, _) => {
    resolve(findPredicateVersionByCode(code));
  });
});

mockPredicateService.findCurrentVersion.mockImplementation(() => {
  return new Promise((resolve, _) => {
    resolve(findPredicateVersionByCode(predicateCurrentVersion));
  });
});

mockPredicateService.listVersions.mockImplementation(
  (params: GetPredicateVersionParams) => {
    return new Promise((resolve, _) => {
      resolve({
        currentPage: 0,
        totalPages: 1,
        nextPage: 1,
        prevPage: 0,
        perPage: 10,
        total: predicateVersions.length,
        data: predicateVersions,
      });
    });
  },
);

export default mockPredicateService;
