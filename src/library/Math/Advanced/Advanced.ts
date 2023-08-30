import { IAdvanced, IAdvancedParams } from './types';

export class Advanced implements IAdvanced {
    private a: number;
    private b: number;

    constructor(params: IAdvancedParams) {
        const { a, b } = params;
        this.a = a;
        this.b = b;
    }

    public root = () => {
        return this.a ** (1 / this.b);
    };

    public power = () => {
        return this.a ** this.b;
    };

    public log = (name: string) => {
        return `Return a simple text with your name - ${name}`;
    };
}
