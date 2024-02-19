import { Provider } from 'fuels';

const { PROVIDER } = process.env;

export class LocalProvider extends Provider {
  constructor() {
    super(PROVIDER!);
  }
}
