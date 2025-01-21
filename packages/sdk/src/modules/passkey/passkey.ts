// criacao de conta:
// 1. abre um frame com um botao de criar conta - TERMOS DE USO
// 2. clica no botao -> abre uma popup que reendeniza bako.safe
// 3. usuario preenche o nome e clica em criar conta
// 4. bako.safe publica na api um novo usuario, ao finalizar a api envia uma mensagem para a sdk com o resultado
import { SocketClient } from './clientSocket';
import { Popup } from './iframe';
import { createUserRequest, TypeUser } from './services/createUser';
import { SocketEvents, SocketUsernames, PopupActions } from './types';
import { sessionId, requestId } from './utils';
import { hardwareId } from './utils/hardwareId';
import { Address } from 'fuels';
import { addPasskey, listPasskeys } from './utils/passkeyId';

const ui_url = 'http://localhost:5173/bakoui.html';

export class Passkey {
  client: SocketClient;
  activeAction: boolean = false;

  constructor() {
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
    // const isValid = this.isValidUsername(username);
    const isValid = true;

    if (hasActiveAction || !isValid) {
      return {};
    }

    this.activeAction = true;

    const p = new Popup({
      url: ui_url,
      width: 500,
      height: 500,
      requestId,
      sessionId,
      action: PopupActions.CREATE,
    });
    p.createPopup();

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        this.activeAction = false;
        p.destroyPopup();
        reject('Timeout');
      }, 30000);

      return this.client.onMessage(({ type, ...message }) => {
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

          createUserRequest({
            address,
            webauthn,
            type: TypeUser.FUEL,
            provider: 'https://testnet.fuel.network/v1/graphql',
          })
            .then(({ code }) => {
              addPasskey(webauthn.id, {
                address,
                ...webauthn,
              });

              resolve({
                ...webauthn,
                challange: code,
                address,
              });
            })
            .catch((error) => {
              reject(error);
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

    const p = new Popup({
      url: ui_url,
      width: 500,
      height: 500,
      requestId,
      sessionId,
      action: PopupActions.SIGN,
    });
    p.createPopup();

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        this.activeAction = false;
        p.destroyPopup();
        reject('Timeout');
      }, 30000);

      return this.client.onMessage(({ type, ...message }) => {
        if (type === SocketEvents.PASSKEY_UI_CONNECTED) {
          console.log('passkeyId', message);
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
          const { signature } = message.data;

          resolve(signature);
        }
      });
    });
  }

  myPasskeys() {
    console.log('myPasskeys', listPasskeys());
    return listPasskeys();
  }
}
