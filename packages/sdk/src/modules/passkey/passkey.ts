import { JSONRPCClient } from 'json-rpc-2.0';
import { Provider, TransactionResult } from 'fuels';
import { Vault, VaultTransaction } from '../vault';
import {
  Account,
  CreateAccountRequest,
  JSONRpcMessageRequest,
  Passkeys,
  PopupActions,
  SignMessageRequest,
} from './types';
import { IStorage, StorageKeys, Storage } from './storage';
import { hardwareId, Popup, makeUrlPopup, MESSAGE_ALLOW_ORIGIN } from './utils';
import { bakoCoder, SignatureType } from '../coders';

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
  createAccount(username: string): Promise<Account> {
    return new Promise<Account>(async (resolve, reject) => {
      const { popup, url } = makeUrlPopup(PopupActions.CREATE);
      this.popup = new Popup(url, popup);

      try {
        this.popup?.once('timeout', () => {
          reject(new Error('Timeout waiting for popup to be ready'));
        });

        this.popup?.once('close', () => {
          reject(new Error('Popup was closed'));
        });

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
          identifier: username,
          id,
        };

        const olders = await this.storage.getItem(StorageKeys.PASSKEY);
        const passkeys = [
          ...JSON.parse(olders || '[]'),
          { id, passkey: predicate },
        ];

        await this.storage.setItem([
          [StorageKeys.PASSKEY, JSON.stringify(passkeys)],
        ]);

        resolve(predicate);
      } catch (error) {
        reject(error);
      } finally {
        this.popup?.destroyPopup();
      }
    });
  }

  /**
   * Signs a message using a specific passkey.
   * @param {string} challenge - Challenge message to be signed.
   * @param {string} passkeyId - Identifier of the passkey to use.
   * @returns {Promise<SignMessageRequest>} - Signed message.
   * @throws {Error} - Throws an error if the parameters are invalid.
   */
  async signMessage(challenge: string): Promise<SignMessageRequest> {
    return new Promise<SignMessageRequest>(async (resolve, reject) => {
      const passkeyId = this.signer?.id;

      if (!challenge || !passkeyId || !this.signer) {
        return Promise.reject(new Error('Invalid parameters'));
      }

      const { popup, url } = makeUrlPopup(PopupActions.SIGN);
      this.popup = new Popup(url, popup);

      this.popup?.once('timeout', () => {
        reject(new Error('Timeout waiting for popup to be ready'));
      });

      this.popup?.once('close', () => {
        reject(new Error('Popup was closed'));
      });

      try {
        const s: SignMessageRequest = await this.client.request(
          JSONRpcMessageRequest.SIGN_MESSAGE,
          {
            challenge,
            passkeyId,
            publicKey: this.signer.publickey,
          },
        );

        resolve(s);
      } catch (error) {
        reject(error);
      } finally {
        this.popup?.destroyPopup();
      }
    });
  }

  /**
   * Signs a transaction using the current vault and signer.
   * @param {TransactionRequest} _tx - Transaction to be signed.
   * @returns {Promise<T>} - Result of the signed transaction.
   */
  async sendTransaction(_tx: VaultTransaction): Promise<TransactionResult> {
    return new Promise<TransactionResult>(async (resolve, reject) => {
      if (!this.vault || !this.signer) {
        return Promise.reject(new Error('Invalid parameters'));
      }

      const { popup, url } = makeUrlPopup(PopupActions.SIGN);
      this.popup = new Popup(url, popup);

      this.popup?.once('timeout', () => {
        reject(new Error('Timeout waiting for popup to be ready'));
      });

      this.popup?.once('close', () => {
        reject(new Error('Popup was closed'));
      });

      try {
        const { hashTxId, tx } = await this.vault.transaction(_tx);

        const s: SignMessageRequest = await this.client.request(
          JSONRpcMessageRequest.SIGN_MESSAGE,
          {
            challenge: hashTxId,
            passkeyId: this.signer.id,
            publicKey: this.signer.publickey,
          },
        );

        this.popup?.destroyPopup();

        tx.witnesses = bakoCoder.encode([
          {
            type: SignatureType.WebAuthn,
            ...s,
          },
        ]);

        const r = await this.vault.send(tx);
        const response = await r.waitForResult();
        resolve(response);
      } catch (error) {
        reject(error);
      } finally {
        this.popup?.destroyPopup();
      }
    });
  }

  /**
   * Retrieves the list of passkeys associated with the current hardware ID.
   * @returns {Promise<Passkeys[]>} - List of passkeys for the current hardware.
   */
  async myPasskeys(): Promise<Passkeys[]> {
    const passkeys = await this.storage.getItem(StorageKeys.PASSKEY);
    const byHardware: Passkeys[] = JSON.parse(passkeys || '[]').filter(
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
    const { signerAddress: address } = passkey;

    this.vault = new Vault(this.provider, rest, version);

    this.signer = {
      id,
      config: passkey.conf,
      address,
      publickey: passkey.publicKey,
    };

    return !!this.vault && !!this.signer;
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
