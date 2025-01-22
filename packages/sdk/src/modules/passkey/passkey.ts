// criacao de conta:
// 1. abre um frame com um botao de criar conta - TERMOS DE USO
// 2. clica no botao -> abre uma popup que reendeniza bako.safe
// 3. usuario preenche o nome e clica em criar conta
// 4. bako.safe publica na api um novo usuario, ao finalizar a api envia uma mensagem para a sdk com o resultado
import { SocketClient } from './clientSocket';
import { Popup } from './iframe';
import { SocketEvents, SocketUsernames, PopupActions } from './types';
import { sessionId, requestId } from './utils'; // keep consumed of localstorage
import { hardwareId } from './utils/hardwareId';
import { Address, Provider } from 'fuels';
import { Vault, VaultConfigurable } from '../vault';
import { IStorage, StorageKeys, Storage } from './storage';
import { makeUrlPopup } from './utils/makeUrlPopup';

export class Passkey {
  client: SocketClient;
  vault: Vault | null = null;
  signer: Record<string, any> | null = null;
  activeAction: boolean = false;

  provider: Provider;
  storage: IStorage;

  // needs a provider
  // needs a storage mechanism
  constructor(provider: Provider, storage?: IStorage) {
    this.provider = provider;
    this.storage = !storage ? new Storage() : storage;

    this.client = new SocketClient(
      SocketUsernames.PASSKEY,
      sessionId,
      requestId,
    );
  }

  // abre o popup
  // ao receber info de conexao da ui (popup) envia a mensagem de criar conta
  // aguarda criacao de conta pela ui (popup)
  // ao receber uma resposta, publica na api e adiciona o challange na resposta
  // retorna a resposta para o dapp
  createAccount(username: string): Record<string, any> {
    const hasActiveAction = this.activeAction;
    const isValid = true;

    if (hasActiveAction || !isValid) {
      return {};
    }

    this.activeAction = true;
    const { popup, url } = makeUrlPopup(
      PopupActions.CREATE,
      sessionId,
      requestId,
    );

    const p = new Popup(url, popup);

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        this.activeAction = false;
        p.destroyPopup();
        reject('Timeout');
      }, 30000);

      return this.client.onMessage(async ({ type, ...message }) => {
        if (type === SocketEvents.PASSKEY_UI_CONNECTED) {
          this.client.sendMessage({
            type: SocketEvents.PASSKEY_CREATE_REQUEST,
            data: {
              username,
            },
            to: SocketUsernames.UI,
          });
        }

        if (type === SocketEvents.PASSKEY_CREATE_RESPONSE) {
          this.activeAction = false;
          p.destroyPopup();
          const { account, id } = message.data;
          const webauthn = {
            id,
            hardware: hardwareId,
            publicKey: account.publicKeyHex,
            origin: window.location.origin,
          };
          const address = Address.fromB256(account.address).toString();

          const config: VaultConfigurable = {
            SIGNATURES_COUNT: 1,
            SIGNERS: [address],
          };

          this.vault = new Vault(this.provider, config);

          const newPasskeys = [
            ...(await this.myPasskeys()),
            {
              id: webauthn.id,
              passkey: {
                address,
                conf: JSON.stringify(this.vault.configurable),
                ...webauthn,
              },
            },
          ];

          await this.storage.setItem([
            [StorageKeys.PASSKEY, JSON.stringify(newPasskeys)],
          ]);

          resolve({
            ...webauthn,
            challange: account.challange,
            passkeyAddress: address,
            vaultAddress: this.vault.address,
          });
        }
      });
    });
  }

  // abre o popup
  // ao receber info de conexao da ui (popup) envia a mensagem de solicitar assinatura
  // aguarda assinatura pela ui (popup)
  // retorna a resposta para o dapp
  signMessage(
    challenge: string,
    passkeyId: string,
    publicKey: string,
  ): Promise<string> {
    const hasActiveAction = this.activeAction;
    const haschallenge = challenge.length > 0;
    const hasPasskeyId = passkeyId.length > 0;

    if (hasActiveAction || !haschallenge || !hasPasskeyId) {
      throw new Error('Invalid parameters');
    }

    // get public key here by passkey id

    this.activeAction = true;
    const { popup, url } = makeUrlPopup(
      PopupActions.SIGN,
      sessionId,
      requestId,
    );

    const p = new Popup(url, popup);

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        this.activeAction = false;
        p.destroyPopup();
        reject('Timeout');
      }, 30000);

      return this.client.onMessage(({ type, ...message }) => {
        if (type === SocketEvents.PASSKEY_UI_CONNECTED) {
          this.client.sendMessage({
            type: SocketEvents.PASSKEY_SIGN_REQUEST,
            data: {
              challenge,
              passkeyId,
              publicKey,
            },
            to: SocketUsernames.UI,
          });
        }

        if (type === SocketEvents.PASSKEY_SIGN_RESPONSE) {
          this.activeAction = false;
          p.destroyPopup();
          // @ts-ignore
          resolve(message.data);
        }
      });
    });
  }

  // verifica se o vault está conectado
  isConnected() {
    return !!this.vault && !!this.signer;
  }

  //recebe uma passkey já criada dentro do storage
  // cria o vault com as infos relacionadas
  async connect(passkeyId: string): Promise<boolean> {
    const passkeys = await this.myPasskeys();

    const pk = passkeys?.find((p: any) => p.id === passkeyId);
    if (!pk) {
      return false;
    }

    const { id, passkey } = pk;
    const config: VaultConfigurable = JSON.parse(passkey?.conf || '{}');
    // @ts-ignore
    this.vault = new Vault(this.provider, config, config.signer);
    this.signer = {
      id,
      config,
      address: passkey?.address,
      publickey: passkey?.publicKey,
    };

    return !!this.vault;
  }

  // desconecta o vault
  disconnect() {
    this.vault = null;
  }

  getFaucet() {
    const fuelFaucet = 'https://faucet-testnet.fuel.network/';

    if (this.provider.url === 'https://testnet.fuel.network/v1/graphql') {
      const redirect = `${fuelFaucet}?address=${this.vault?.address.toB256()}&autoClose&redirectUrl=${
        window.location.href
      }`;
      window.open(redirect);
    }
  }

  async myPasskeys() {
    const passkeys = await this.storage.getItem(StorageKeys.PASSKEY);
    const byHardware = JSON.parse(passkeys || '[]').filter(
      (k: any) => k.passkey.hardware === hardwareId,
    );
    return byHardware;
  }
}
