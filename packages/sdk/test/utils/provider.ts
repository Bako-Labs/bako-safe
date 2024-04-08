import { BakoSafe } from '../../configurables';
import { Provider } from 'fuels';

export class LocalProvider extends Provider {
  constructor() {
    super(BakoSafe.getProviders('CHAIN_URL'));
  }
}
