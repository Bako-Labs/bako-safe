import { Provider } from 'fuels';
import { BakoSafe } from '../../configurables';

export class LocalProvider extends Provider {
  constructor() {
    super(BakoSafe.getProviders('CHAIN_URL'));
  }
}
