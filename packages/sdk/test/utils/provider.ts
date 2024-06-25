import { Provider } from 'fuels';
import { BakoSafe, defaultConfig } from '../../configurables';
import { IBakoSafeAuth } from '../../src';

export class LocalProvider extends Provider {
  constructor() {
    super(BakoSafe.getProviders('CHAIN_URL'));
  }
}

export class GatewayProvider extends Provider {
  constructor(url: string) {
    super(url);
  }

  static connect(vaultId: string, auth: IBakoSafeAuth) {
    const url = `${defaultConfig.GATEWAY_URL}?api_token=${JSON.stringify(auth)}&vault_id=${vaultId}`;
    console.log(encodeURI(url));
    return super.create(url);
  }
}
