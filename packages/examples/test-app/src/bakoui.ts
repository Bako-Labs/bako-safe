import {
  bytesToHex,
  createAccount,
  PopupActions,
  signChallange,
  SocketClient,
  SocketEvents,
  SocketUsernames,
} from 'bakosafe';

const getUrlParams = (): Record<string, string> => {
  const params = new URLSearchParams(window.location.search);
  const result: Record<string, string> = {};

  params.forEach((value, key) => {
    result[key] = value;
  });

  return result;
};

const client = new SocketClient(
  SocketUsernames.UI,
  getUrlParams().sessionId,
  getUrlParams().requestId,
);

client.sendMessage({
  type: SocketEvents.PASSKEY_UI_CONNECTED,
  data: {},
  to: SocketUsernames.PASSKEY,
});

const action = getUrlParams().action;

client.onMessage(async (message) => {
  console.log('message', message);
  if (
    message.type === SocketEvents.PASSKEY_CREATE_REQUEST &&
    action === PopupActions.CREATE
  ) {
    const account = await createAccount(
      message.data.username,
      bytesToHex(crypto.getRandomValues(new Uint8Array(32))),
    );

    client.sendMessage({
      type: SocketEvents.PASSKEY_CREATE_RESPONSE,
      data: {
        account,
        id: account.credential?.id,
      },
      to: SocketUsernames.PASSKEY,
    });
  }

  if (
    message.type === SocketEvents.PASSKEY_SIGN_REQUEST &&
    action === PopupActions.SIGN
  ) {
    const { challenge, passkeyId, publicKey } = message.data;

    signChallange(passkeyId, challenge, publicKey)
      .then((signature) => {
        client.sendMessage({
          type: SocketEvents.PASSKEY_SIGN_RESPONSE,
          data: {
            signature: signature?.signature,
          },
          to: SocketUsernames.PASSKEY,
        });
      })
      .catch((error) => {
        throw new Error(error);
      });
  }
});
