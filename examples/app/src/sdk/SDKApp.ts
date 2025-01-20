import { JSONRPCClient } from 'json-rpc-2.0';
import { EventEmitter } from 'events';

const APP_URL = new URL('http://localhost:5174/sdk.html');


function hideIframe(iframe: HTMLIFrameElement) {
  iframe.style.width = '0px';
  iframe.style.height = '0px';
}

function showIframe(iframe: HTMLIFrameElement) {
  iframe.style.width = '100%';
  iframe.style.height = '100%';
}

export class SDKApp extends EventEmitter {
  uuid: string;
  iframe: HTMLIFrameElement;
  client: JSONRPCClient;

  constructor(targetElementId: string) {
    super();
    
    const uuid = crypto.randomUUID();
    // Find target element where iframe will be injected
    const targetElement = document.getElementById(targetElementId);
    console.log('injecting sdk into', targetElement);
    if (!targetElement) {
      throw new Error(`Target element with id '${targetElementId}' not found`);
    }

    // Create iframe element
    const iframe = document.createElement('iframe');
    hideIframe(iframe);
    iframe.id = uuid;
    this.uuid = uuid;

    // Set sandbox attributes to allow minimal required features for WebAuthn
    iframe.sandbox.add(
      'allow-same-origin',  // Required for WebAuthn
      'allow-scripts',      // Required for running JavaScript
      // 'allow-popups',       // May be needed for some WebAuthn UI
      // 'allow-forms'         // Required for credential creation/getting
    );

    // Additional security attributes
    iframe.setAttribute('allow', 'publickey-credentials-get; publickey-credentials-create');

    // Set other iframe properties
    iframe.style.border = 'none';

    // Set source to the SDK page
    iframe.src = APP_URL.toString();

    // Inject iframe into target element
    targetElement.appendChild(iframe);

    this.iframe = iframe;
    this.client = new JSONRPCClient(this.sendMessage.bind(this));

    window.addEventListener('message', (event) => {
      if (event.origin !== APP_URL.origin) return;
      if (event.data.jsonrpc) {
        this.client.receive(event.data);  
      } else {
        this.emit(event.data.event, event.data.payload);
      }
    });

    this.on('register', (data) => {
      localStorage.setItem('data-auth', JSON.stringify(data));
      hideIframe(this.iframe);
    });
  }

  async isRegistered(): Promise<boolean> {
    const reuslt = await this.client.request('isRegistered', []);
    console.log(reuslt);
    return reuslt;
  }

  async register() {
    console.log('register');
    showIframe(this.iframe);
  }

  async getUser() {
    return this.client.request('getUser', []);
  }

  async signMessage(message: string) {
    return this.client.request('signMessage', [message]);
  }

  private sendMessage(message: any) {
    this.iframe.contentWindow?.postMessage(message, APP_URL.origin);
  }
}
