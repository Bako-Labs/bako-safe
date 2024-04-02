import { BakoSafe } from '../../configurables';
import { Provider } from 'fuels';

export class LocalProvider extends Provider {
  constructor() {
    super(BakoSafe.get('PROVIDER'));
  }
}
