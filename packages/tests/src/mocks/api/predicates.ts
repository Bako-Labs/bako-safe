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
  currentVersion,
  findPredicateVersionByCode,
  predicateCurrentVersion,
  predicateVersinsList,
  predicateVersions,
} from '../predicateVersions';
import { random_user_avatar } from '../avatars';
import { predicates } from '../predicates';
import { transactions } from '../transactions';

class PredicateStorage {
  private predicates: IPredicate[] = [
    predicates['PREDICATE_1'],
    predicates['PREDICATE_2'],
  ];

  public publish(predicate: IPredicate) {
    this.predicates.push(predicate);
  }

  public async predicateVersionById(id: string) {
    const list = await predicateVersinsList();
    const version = list.find(({ id: predicateId }) => predicateId === id);

    return version;
  }

  public async predicateVersionsList() {
    const list = await predicateVersinsList();

    return list;
  }

  public async currentVersion() {
    const version = await currentVersion();

    return version;
  }

  public async predicateVersionByCode(_code: string) {
    const list = await predicateVersinsList();
    const version = list.find(({ code }) => code === _code);
    if (!version) {
      throw new Error('Invalid predicate version');
    }

    return version;
  }

  public async findByAddress(address: string) {
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
    currentVersion().then((version) => {
      payload.versionCode = payload.versionCode ?? version.code;
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
        version: version,
        workspace: workspace['WORKSPACE_1'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockPredicateService.store.publish(predicate);
      resolve(predicate);
    });
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
        data: transactions,
        nextPage: params.page ?? 0 + 1,
        prevPage: params.page ?? 0 - 1,
        currentPage: params.page ?? 0,
        total: transactions.length,
        perPage: params.perPage ?? 10,
        totalPages: 1,
      });
    });
  },
);

mockPredicateService.findVersionByCode.mockImplementation((code: string) => {
  return new Promise((resolve, reject) => {
    mockPredicateService.store
      .predicateVersionByCode(code)
      .then((version) => {
        resolve(version);
      })
      .catch((error) => {
        reject(error);
      });
  });
});

mockPredicateService.findCurrentVersion.mockImplementation(() => {
  return new Promise((resolve, _) => {
    mockPredicateService.store.currentVersion().then((version) => {
      resolve(version);
    });
  });
});

mockPredicateService.listVersions.mockImplementation(
  (params: GetPredicateVersionParams) => {
    return new Promise((resolve, _) => {
      mockPredicateService.store
        .predicateVersionsList()
        .then((predicateVersions) => {
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
    });
  },
);

export default mockPredicateService;
