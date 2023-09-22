export interface IPredicatePayload {
    name: string;
    description: string;
    predicateAddress: string;
    minSigners: number;
    addresses: string[];
    owner: string;
    bytes: string;
    abi: string;
    configurable: string;
    provider: string;
    chainId?: number;
}

export interface IPredicate extends IPredicatePayload {
    id: string;
    createdAt: string;
    updatedAt: string;
}

export interface IPredicateService {
    create: (payload: IPredicatePayload) => Promise<IPredicate>;
    findByAddress: (predicateAddress: string) => Promise<IPredicate>;
}
