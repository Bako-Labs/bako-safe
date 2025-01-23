import React, { useEffect, useState } from 'react';
import { bakoCoder, Passkey, SignatureType } from 'bakosafe';
import { Provider } from 'fuels';
import './App.css'; // Adicione este arquivo CSS

const provider_url = 'https://testnet.fuel.network/v1/graphql';

const App: React.FC = () => {
  const [passkey, setPasskey] = useState<Passkey | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [vaultInfo, setVaultInfo] = useState<any>(null);
  const [signature, setSignature] = useState<string>('');

  useEffect(() => {
    const initPasskey = async () => {
      try {
        const provider = await Provider.create(provider_url);
        const pk = new Passkey(provider);
        const keys = await pk.myPasskeys();
        setPasskey(pk);
        setPasskeys(keys);
      } catch (error) {
        console.error('Error initializing passkey:', error);
      }
    };
    initPasskey();
  }, []);

  const createAccount = async () => {
    if (!passkey) return;

    try {
      const account = await passkey.createAccount('username');
      setUserInfo({
        address: account.signerAddress,
        publicKey: account.publicKey,
        id: account.id,
      });

      const connected = await passkey.connect(account.id);
      if (connected) {
        const balance = await passkey.vault?.getBalance();

        setVaultInfo({
          address: passkey.vault?.address.toString(),
          signer: passkey.signer?.address,
          balance: balance?.format(),
          network: passkey.provider.url,
        });
        await loadPasskeys();
        await connectPasskey(account.id);
      }
    } catch (error) {
      console.error('Error creating account:', error);
    }
  };

  const loadPasskeys = async () => {
    if (!passkey) return;
    try {
      const keys = await passkey.myPasskeys();
      setPasskeys(keys);
    } catch (error) {
      console.error('Error loading passkeys:', error);
    }
  };

  const connectPasskey = async (id: string) => {
    if (!passkey) return;

    try {
      const connected = await passkey.connect(id);
      if (connected) {
        const balance = await passkey.vault?.getBalance();
        setVaultInfo({
          address: passkey.vault?.address.toString(),
          signer: passkey.signer?.address,
          balance: balance?.format(),
          network: passkey.provider.url,
        });
      }
    } catch (error) {
      console.error('Error connecting passkey:', error);
    }
  };

  const sendTransaction = async () => {
    if (!passkey || !passkey.isConnected() || !passkey.vault) return;

    try {
      const tx = await passkey.sendTransaction({
        name: 'sendTransaction-by-passkey-dapp',
        assets: [
          {
            assetId: passkey.vault.provider.getBaseAssetId(),
            amount: '0.0001',
            to: '0x7175e9Bb2b9448aDc7356EAC76b7248eD00650B2Ab31A926761B5Cd69718d5a1',
          },
        ],
      });
      await connectPasskey(passkey.signer?.id);

      console.log('Transaction response:', tx);
    } catch (error) {
      console.error('Error sending transaction:', error);
    }
  };

  return (
    <div className="container">
      <header>
        <h1>Main App</h1>
      </header>
      <section>
        <button onClick={createAccount}>Create Passkey</button>
        <div className="actions"></div>
        {userInfo && (
          <div className="user-info">
            <h3>User: {userInfo.address}</h3>
            <h3>ID: {userInfo.id}</h3>
          </div>
        )}
      </section>
      <section className="content">
        <div className="passkeys">
          <h3>Passkeys</h3>
          {passkeys.map((p: any) => (
            <p key={p.passkey.id} onClick={() => connectPasskey(p.passkey.id)}>
              {p.passkey.id}
            </p>
          ))}
        </div>

        {vaultInfo && (
          <div className="vault-info">
            <h3>Vault Connected</h3>
            <h3>Address: {vaultInfo.address}</h3>
            <h3>Signer: {vaultInfo.signer}</h3>
            <h3>Balance: {vaultInfo.balance}</h3>
            <h3>Network: {vaultInfo.network}</h3>
            <button onClick={sendTransaction}>Send Transaction</button>
            <button
              onClick={() => {
                passkey?.getFaucet();
              }}
            >
              faucet
            </button>
          </div>
        )}
      </section>
      {signature && (
        <section>
          <h3>
            Sign: <span>{signature}</span>
          </h3>
        </section>
      )}
    </div>
  );
};

export default App;
