/* eslint-disable @typescript-eslint/no-unused-vars */
import { io, Socket } from 'socket.io-client';
import axios, { AxiosInstance } from 'axios';
import {
  Asset,
  JsonAbi,
  FuelConnector,
  FuelConnectorEventTypes,
  TransactionRequestLike,
} from 'fuels';

import { BakoSafeConnectors } from './types';
import { DAppWindow } from './DAPPWindow';

import {
  API_URL,
  APP_BSAFE_URL,
  APP_DESCRIPTION,
  APP_IMAGE_DARK,
  APP_IMAGE_LIGHT,
  APP_NAME,
} from './constants';

type FuelABI = JsonAbi;
type Network = {
  url: string;
  chainId: number;
};

export class BSafeConnector extends FuelConnector {
  name = APP_NAME;
  metadata = {
    image: {
      light: APP_IMAGE_LIGHT,
      dark: APP_IMAGE_DARK,
    },
    install: {
      action: APP_BSAFE_URL,
      link: APP_BSAFE_URL,
      description: APP_DESCRIPTION,
    },
  };
  installed: boolean = true;
  connected: boolean = false;

  events = {
    ...FuelConnectorEventTypes,
    ...BakoSafeConnectors,
  };

  private readonly socket: Socket;
  private readonly sessionId: string;
  private readonly api: AxiosInstance = axios.create({
    baseURL: API_URL,
  });
  private dAppWindow: DAppWindow;

  constructor() {
    super();
    let sessionId: string = localStorage.getItem('sessionId') || '';
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('sessionId', sessionId);
    }

    this.sessionId = sessionId;

    this.socket = io(API_URL!, {
      auth: {
        username: `${'[WALLET]'}`,
        data: new Date(),
        sessionId: this.sessionId,
        origin: window.origin,
      },
    });

    this.dAppWindow = new DAppWindow({
      sessionId,
      name: document.title,
      origin: window.origin,
      popup: {
        top: 0,
        left: 2560,
        width: 450,
        height: 1280,
      },
    });

    this.socket.on(BakoSafeConnectors.DEFAULT, (message) => {
      this.emit(message.type, ...message.data);
    });
  }

  async connect() {
    return new Promise<boolean>((resolve) => {
      const dappWindow = this.dAppWindow.open('/');
      dappWindow?.addEventListener('close', () => {
        resolve(false);
      });

      // @ts-ignore
      this.on(BakoSafeConnectors.CONNECTION, (connection: boolean) => {
        this.connected = connection;
        resolve(connection);
      });
    });
  }

  /*
   * @param {string} address - The address to sign the transaction
   * @param {Transaction} transaction - The transaction to send
   *
   * @returns {string} - The transaction id
   */
  async sendTransaction(
    _address: string,
    _transaction: TransactionRequestLike,
  ) {
    return new Promise<string>((resolve, reject) => {
      const dappWindow = this.dAppWindow.open(`/dapp/transaction`);
      dappWindow?.addEventListener('close', () => {
        reject('closed');
      });
      // @ts-ignore
      this.on(BakoSafeConnectors.POPUP_TRANSFER, () => {
        this.socket.emit(BakoSafeConnectors.TRANSACTION_SEND, {
          to: `${this.sessionId}:${window.origin}`,
          content: {
            address: _address,
            transaction: _transaction,
          },
        });
      });
      // @ts-ignore
      this.on(BakoSafeConnectors.TRANSACTION_CREATED, (content) => {
        resolve(`0x${content}`);
      });
    });
  }

  async ping() {
    return true;
  }

  //todo: make a file on sdk, to return this object
  async version() {
    return {
      app: '0.0.1',
      network: '>=0.12.4',
    };
  }

  async isConnected() {
    const { data } = await this.api.get(`/connections/${this.sessionId}/state`);

    return data;
  }

  async accounts() {
    const { data } = await this.api.get(
      `/connections/${this.sessionId}/accounts`,
    );
    return data;
  }

  async currentAccount() {
    const { data } = await this.api.get(
      `/connections/${this.sessionId}/currentAccount`,
    );
    return data;
  }

  async disconnect() {
    this.socket.emit(BakoSafeConnectors.AUTH_DISCONECT_DAPP, {
      to: `${this.sessionId}:${window.origin}`,
      content: {
        sessionId: this.sessionId,
      },
    });
    this.emit(BakoSafeConnectors.CONNECTION, false);
    this.emit(BakoSafeConnectors.ACCOUNTS, []);
    this.emit(BakoSafeConnectors.CURRENT_ACCOUNT, null);
    return false;
  }

  async currentNetwork() {
    const { data } = await this.api.get(
      `/connections/${this.sessionId}/currentNetwork`,
    );
    return data;
  }

  async assets(): Promise<Asset[]> {
    return [];
  }

  async signMessage(address: string, message: string): Promise<string> {
    throw new Error('Method not implemented.');
  }

  async addAssets(assets: Asset[]): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async addAsset(assets: Asset): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async addNetwork(networkUrl: string): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async selectNetwork(network: Network): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
  async networks(): Promise<Array<Network>> {
    throw new Error('Method not implemented.');
  }

  async addABI(contractId: string, abi: FuelABI): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async getABI(id: string): Promise<FuelABI | null> {
    throw new Error('Method not implemented.');
  }

  async hasABI(id: string): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
}
