export interface IAdvancedParams {
    a: number;
    b: number;
}

export interface IAdvanced {
    root: () => number;
    power: () => number;
    log: (text: string) => string;
}
