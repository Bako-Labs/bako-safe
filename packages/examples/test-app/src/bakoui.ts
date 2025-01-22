import {
  bytesToHex,
  createAccount,
  signChallange,
  JSONRpcMessageRequest,
} from 'bakosafe';
import { JSONRPCServer } from 'json-rpc-2.0';

const getUrlParams = (): Record<string, string> => {
  const params = new URLSearchParams(window.location.search);
  const result: Record<string, string> = {};

  params.forEach((value, key) => {
    result[key] = value;
  });

  return result;
};

const server = new JSONRPCServer();

window.addEventListener('message', async (event) => {
  const isValid = event.origin === getUrlParams().origin;
  if (!isValid) return;
  if (event.data.jsonrpc) {
    await server.receive(event.data).then((response) => {
      event.source?.postMessage(response, {
        targetOrigin: event.origin,
      });
    });
  }
});

server.addMethod(JSONRpcMessageRequest.CREATE_ACCOUNT, async ({ username }) => {
  const account = await createAccount(
    username,
    bytesToHex(crypto.getRandomValues(new Uint8Array(32))),
  );

  return {
    account: {
      address: account.address,
      publickKey: account.publicKeyHex,
      origin: window.location.origin,
    },
    id: account.credential?.id,
  };
});

server.addMethod(
  JSONRpcMessageRequest.SIGN_MESSAGE,
  async ({ challenge, passkeyId, publicKey }) => {
    return await signChallange(passkeyId, challenge, publicKey);
  },
);
