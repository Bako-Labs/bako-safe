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
import { predicates } from '../predicates';

class PredicateStorage {
  private predicates: IPredicate[] = [
    predicates['PREDICATE_1'],
    predicates['PREDICATE_2'],
  ];

  public publish(predicate: IPredicate) {
    this.predicates.push(predicate);
  }

  public predicateVersionById(id: string) {
    const version = predicateVersions.find(
      ({ id: predicateId }) => predicateId === id,
    );
    if (!version) {
      throw new Error('Version not found');
    }

    return version;
  }

  public predicateVersionByCode(_code: string) {
    const version = predicateVersions.find(({ code }) => code === _code);
    if (!version) {
      throw new Error('Version not found');
    }

    return version;
  }

  public findByAddress(address: string) {
    const item = this.predicates.find(
      ({ predicateAddress }) => predicateAddress === address,
    );

    if (!item) {
      throw new Error('Predicate not found');
    }

    return item;
  }

  public findById(id: string) {
    const item = this.predicates.find(
      ({ id: predicateId }) => predicateId === id,
    );
    if (!item) {
      throw new Error('Predicate not found');
    }

    return item;
  }

  public clear() {
    this.predicates = [];
  }

  public restore() {
    this.predicates = [predicates['PREDICATE_1'], predicates['PREDICATE_2']];
  }
}

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
  //storage
  store: new PredicateStorage(),
};

// Implementação dos mocks utilizando os parâmetros da request:
mockPredicateService.create.mockImplementation((payload: IPredicatePayload) => {
  return new Promise((resolve, _) => {
    const predicate = {
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
    };
    mockPredicateService.store.publish(predicate);
    resolve(predicate);
  });
});

mockPredicateService.findByAddress.mockImplementation(
  (predicateAddress: string) => {
    return new Promise((resolve, _) => {
      resolve(mockPredicateService.store.findByAddress(predicateAddress));
    });
  },
);

mockPredicateService.findById.mockImplementation((predicateId: string) => {
  return new Promise((resolve, _) => {
    resolve(mockPredicateService.store.findById(predicateId));
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
    resolve(mockPredicateService.store.predicateVersionByCode(code));
  });
});

mockPredicateService.findCurrentVersion.mockImplementation(() => {
  return new Promise((resolve, _) => {
    resolve(
      mockPredicateService.store.predicateVersionByCode(
        predicateCurrentVersion,
      ),
    );
  });
});

mockPredicateService.listVersions.mockImplementation(
  (params: GetPredicateVersionParams) => {
    return new Promise((resolve, _) => {
      resolve({
        currentPage: params.page ?? 0,
        totalPages: 1,
        nextPage: params.page ?? 0 + 1,
        prevPage: params.page ?? 0 - 1,
        perPage: params.perPage ?? 10,
        total: predicateVersions.length,
        data: predicateVersions,
      });
    });
  },
);

export default mockPredicateService;
