import { JSONRPCClient } from 'json-rpc-2.0';
import { Provider } from 'fuels';
import { Vault } from '../vault';
import {
  Account,
  CreateAccountRequest,
  JSONRpcMessageRequest,
  PopupActions,
  SignMessageRequest,
} from './types';
import { IStorage, StorageKeys, Storage } from './storage';
import { hardwareId, Popup, makeUrlPopup, MESSAGE_ALLOW_ORIGIN } from './utils';

export class Passkey {
  /**
   * Instance of the Vault, used for managing accounts and keys.
   */
  vault: Vault | null = null;

  /**
   * Signer object containing account details.
   */
  signer: Record<string, any> | null = null;

  /**
   * Instance of the Popup for handling user interactions.
   */
  popup: Popup | null = null;

  /**
   * Provider instance for interacting with fuel network.
   */
  provider: Provider;

  /**
   * Storage interface for managing persistent data.
   */
  storage: IStorage;

  /**
   * JSON-RPC client for communication between SDK and the popup.
   */
  private client: JSONRPCClient;

  /**
   * Creates an instance of the Passkey class.
   * @param {Provider} provider - Blockchain provider.
   * @param {IStorage} [storage] - Optional storage interface for persistent data.
   */
  constructor(provider: Provider, storage?: IStorage) {
    this.provider = provider;
    this.storage = storage ?? new Storage();

    const client = new JSONRPCClient((message) => {
      this.popup?.sendMessage(message);
    });

    window.addEventListener('message', (event) => {
      const isValid = event.origin === MESSAGE_ALLOW_ORIGIN;
      if (!isValid) return;
      if (!event.data.jsonrpc) return;

      client.receive(event.data);
    });

    this.client = client;
  }

  /**
   * Creates a new account using the popup and stores it in the vault.
   * @param {string} username - Username for the new account.
   * @returns {Promise<Account>} - Predicate object for the created account.
   * @throws {Error} - Throws an error if the popup times out.
   */
  async createAccount(username: string): Promise<Account> {
    const { popup, url } = makeUrlPopup(PopupActions.CREATE);
    this.popup = new Popup(url, popup);
    const timeout = setTimeout(() => {
      this.popup?.destroyPopup();
      throw new Error('Timeout waiting for popup to be ready');
    }, 30000);

    const { id, account }: CreateAccountRequest = await this.client.request(
      JSONRpcMessageRequest.CREATE_ACCOUNT,
      {
        username,
      },
    );

    const vault = new Vault(this.provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [account.address],
    });

    this.vault = vault;
    this.signer = account;

    const predicate = {
      conf: {
        ...this.vault.configurable,
        version: this.vault.version,
      },
      predicateAddress: this.vault.address.toString(),
      signerAddress: account.address,
      hardware: hardwareId,
      origin: account.origin,
      publicKey: account.publicKey,
      id,
    };

    const olders = await this.storage.getItem(StorageKeys.PASSKEY);
    const passkeys = [
      ...JSON.parse(olders || '[]'),
      { id, passkey: predicate },
    ];
    this.storage.setItem([[StorageKeys.PASSKEY, JSON.stringify(passkeys)]]);

    this.popup?.destroyPopup();
    clearTimeout(timeout);

    return predicate;
  }

  /**
   * Signs a message using a specific passkey.
   * @param {string} challenge - Challenge message to be signed.
   * @param {string} passkeyId - Identifier of the passkey to use.
   * @returns {Promise<SignMessageRequest>} - Signed message.
   * @throws {Error} - Throws an error if the parameters are invalid.
   */
  async signMessage(
    challenge: string,
    passkeyId: string,
  ): Promise<SignMessageRequest> {
    if (!challenge || !passkeyId || !this.signer) {
      return Promise.reject(new Error('Invalid parameters'));
    }

    const { popup, url } = makeUrlPopup(PopupActions.SIGN);
    this.popup = new Popup(url, popup);
    const timeout = setTimeout(() => {
      this.popup?.destroyPopup();
      throw new Error('Timeout waiting for popup to be ready');
    }, 30000);

    const s: SignMessageRequest = await this.client.request(
      JSONRpcMessageRequest.SIGN_MESSAGE,
      {
        challenge,
        passkeyId,
        publicKey: this.signer.publickey,
      },
    );

    this.popup?.destroyPopup();
    clearTimeout(timeout);

    return s;
  }

  /**
   * Retrieves the list of passkeys associated with the current hardware ID.
   * @returns {Promise<any[]>} - List of passkeys for the current hardware.
   */
  async myPasskeys() {
    const passkeys = await this.storage.getItem(StorageKeys.PASSKEY);
    const byHardware = JSON.parse(passkeys || '[]').filter(
      (k: any) => k.passkey.hardware === hardwareId,
    );
    return byHardware;
  }

  /**
   * Checks if the user is connected.
   * @returns {boolean} - True if connected, otherwise false.
   */
  isConnected() {
    return !!this.vault && !!this.signer;
  }

  /**
   * Connects to a specific passkey by ID.
   * @param {string} passkeyId - Identifier of the passkey to connect.
   * @returns {Promise<boolean>} - True if connected successfully, otherwise false.
   */
  async connect(passkeyId: string): Promise<boolean> {
    const passkeys = await this.myPasskeys();

    const pk = passkeys?.find((p: any) => p.id === passkeyId);
    if (!pk) {
      return false;
    }

    const { id, passkey } = pk;
    const { version, ...rest } = passkey.conf;

    this.vault = new Vault(this.provider, rest, version);
    this.signer = {
      id,
      config: passkey.config,
      address: passkey.address,
      publickey: passkey.publicKey,
    };

    return !!this.vault;
  }

  /**
   * Disconnects the current vault and signer.
   */
  disconnect() {
    this.vault = null;
  }

  /**
   * Opens the Fuel testnet faucet for the current vault address.
   */
  getFaucet() {
    const fuelFaucet = 'https://faucet-testnet.fuel.network/';

    if (this.provider.url === 'https://testnet.fuel.network/v1/graphql') {
      const redirect = `${fuelFaucet}?address=${this.vault?.address.toB256()}&autoClose&redirectUrl=${
        window.location.href
      }`;
      window.open(redirect);
    }
  }
}
