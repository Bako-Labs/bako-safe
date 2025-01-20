import { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import { WebAuthn, useCreateAccount } from 'bakowallet';
import { Address } from 'fuels';

function App() {
  const [signedMessage, setSignedMessage] = useState<string>();
  const [account, setAccount] = useState<{
    id: string;
    publicKey: string;
    address: string;
  }>();
  const name = `${new Date().getTime()}`;

  const { mutate, data } = useCreateAccount();

  const sign = async () => {
    if (!account) return;
    const b = await WebAuthn.signChallenge(
      account.id,
      `${Address.fromRandom().toString()}`,
      account.publicKey,
    );

    setSignedMessage(b.signature);
  };

  const handleCreate = async () => {
    mutate(
      {
        name: 'dnsaodnasdans12',
        provider: 'https://testnet.fuel.network/v1/graphql',
      },
      {
        onSuccess: ({ address }) => {
          console.log(address);
          setAccount(address);
        },
      },
    );
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
        <button onClick={handleCreate}>create account</button>
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
