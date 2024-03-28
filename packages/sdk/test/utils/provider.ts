import { BSafe } from '../../configurables';
import { Provider } from 'fuels';

export class LocalProvider extends Provider {
  constructor() {
    super(BSafe.get('PROVIDER'));
  }
}
