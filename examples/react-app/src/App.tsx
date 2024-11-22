import { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import { createAccount, signChallange } from 'bakowallet';
import { Address } from 'fuels';

function App() {
  const [signedMessage, setSignedMessage] = useState<string>();
  const [account, setAccount] = useState<{
    id: string;
    publicKey: string;
    address: string;
  }>();
  const name = `${new Date().getTime()}`;

  const create = async () => {
    const a = await createAccount(name, `${Address.fromRandom().toString()}`);
    console.log(a);
    const c = {
      id: a.credential?.id ?? '',
      publicKey: a.publicKeyHex,
      address: a.address,
    };
    setAccount(c);
  };

  const sign = async () => {
    if (!account) return;
    const b = await signChallange(
      account.id,
      `${Address.fromRandom().toString()}`,
      account.publicKey,
    );

    setSignedMessage(b.signature);
  };

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        {/* biome-ignore lint/a11y/useButtonType: <explanation> */}
        <button onClick={create}>create account</button>
        {/* biome-ignore lint/a11y/useButtonType: <explanation> */}
        <button onClick={sign}>sign random message</button>
      </div>
      <p>ACCOUNT</p>
      <p className="read-the-docs">{account?.address}</p>
      <p>SIGNED_MESSAGE</p>
      <p className="read-the-docs">{signedMessage}</p>
    </>
  );
}

export default App;
