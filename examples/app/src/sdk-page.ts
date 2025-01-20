import { SDKServer } from "./sdk/server"

const app = new SDKServer();

function postEvent(event: string, payload: any) {
  window.parent.postMessage({
    event,
    payload
  }, '*');
}

document.querySelector('#register')?.addEventListener('click', async () => {
  const data = await app.register();
  postEvent('register', data);
});

window.addEventListener('message', (event) => {
  console.log('message received', event.data);
  app.processMessage(event.data).then(response => {
    console.log('send response', response);
    window.parent.postMessage(response, '*');
  });
});
