import { IBasic, IBasicParams } from './types';

export class Basic implements IBasic {
    private a: number;
    private b: number;

    constructor(params: IBasicParams) {
        const { a, b } = params;
        this.a = a;
        this.b = b;
    }
    public sum = () => {
        return this.a + this.b;
    };

    public mult = () => {
        return this.a * this.b;
    };
    public div = () => {
        return this.a / this.b;
    };

    public log = (name: string) => {
        return `Return a simple text with your name - ${name}`;
    };
}
