import { defaultConfigurable } from '../../configurables';

export class DAppWindow {
  BSAFEAPP = defaultConfigurable['bsafe_url'];
  constructor(
    private config: {
      popup: {
        top: number;
        left: number;
        width: number;
        height: number;
      };
      sessionId: string;
      name: string;
      origin: string;
    },
  ) {}

  open(method: string) {
    const { popup } = this.config;

    return window.open(
      `${this.BSAFEAPP}${method}${this.queryString}`,
      'popup',
      `left=${popup.left},top=${popup.top},width=${popup.width},height=${popup.height}`,
    );
  }

  private get queryString() {
    const { origin, name, sessionId } = this.config;
    return `?sessionId=${sessionId}&name=${name}&origin=${origin}`;
  }
}
