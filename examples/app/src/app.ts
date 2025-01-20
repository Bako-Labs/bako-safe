import { SDKApp } from "./sdk"

const app = new SDKApp('app');

app.on('register', async (data: any) => {
  setUser();
  console.log('[APP] user registered', data);
});

const handleSignMessage = async () => {
  if (await app.isRegistered()) {
    app.signMessage('Hellow Word').then(() => {
      console.log('signed');
    });
  } else {
    app.register();
    app.once('register', async () => handleSignMessage());
  }
}

document.getElementById("signMessage")?.addEventListener('click', handleSignMessage);

async function setUser() {
  const user = await app.getUser();
  const text = document.getElementById('user-address');
  if (text && user) {
    text.innerText = user.address;
  }
}

setTimeout(setUser, 1000);