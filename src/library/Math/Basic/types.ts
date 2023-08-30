export interface IBasicParams {
    a: number;
    b: number;
}

export interface IBasic {
    sum: () => number;
    mult: () => number;
    div: () => number;
    log: (text: string) => string;
}
