import { bakoCoder, Passkey, SignatureType } from 'bakosafe';
import { Provider } from 'fuels';

const provider_url = 'https://testnet.fuel.network/v1/graphql';

const _p = new Promise<Passkey>((resolve, reject) => {
  Provider.create(provider_url)
    .then((provider: Provider) => {
      resolve(new Passkey(provider));
    })
    .catch((error: any) => {
      reject(error);
    });
});

const send_tx = async () => {
  const p = await _p;

  if (!p.isConnected()) return;
  if (!p.vault) return;

  const { hashTxId, tx } = await p.vault?.transaction({
    assets: [
      {
        assetId: p.vault.provider.getBaseAssetId(),
        amount: '0.0001',
        to: '0x7175e9Bb2b9448aDc7356EAC76b7248eD00650B2Ab31A926761B5Cd69718d5a1',
      },
    ],
  });

  const s = await p
    .signMessage(hashTxId, p.signer?.id)
    .then((signature: any) => {
      document.getElementById('user-signature')!.textContent = signature;
      document.getElementById('user-signature')!.hidden = false;
      return signature;
    });

  console.log(s);

  tx.witnesses = bakoCoder.encode([
    {
      type: SignatureType.WebAuthn,
      ...s,
    },
  ]);

  const result = await p.vault?.send(tx);
  const response = await result?.waitForResult();

  console.log('response', response);

  const balance = await p.vault?.getBalance();
  document.getElementById('vault-balance')!.textContent = balance
    .format()
    .toString();

  const explorer = 'https://app-testnet.fuel.network/';
  document.getElementById('tx-result')!.textContent =
    'check result on explorer';

  document.getElementById('tx-result')!.addEventListener('click', () => {
    window.open(`${explorer}tx/${response.id}`);
  });

  document.getElementById('tx-result')!.hidden = false;
};

const loadPk = async () => {
  const passkeysContainer = document.getElementById('passkeys');
  if (passkeysContainer) {
    while (passkeysContainer.firstChild) {
      passkeysContainer.removeChild(passkeysContainer.firstChild);
    }
  }

  const pk = await _p;
  pk.myPasskeys().then((passkeys: any) => {
    console.log('pks', passkeys);
    passkeys.forEach((p: any) => {
      const option = document.createElement('p');
      option.textContent = p.passkey.id;
      option.id = p.passkey.id;

      option.addEventListener('click', () => {
        _p.then((pk) => {
          pk.connect(p.passkey.id);
        }).then(() => {
          _p.then((pk) => {
            if (pk.isConnected()) {
              pk.vault?.getBalance().then((balance: any) => {
                document.getElementById('vault-address')!.textContent =
                  pk.vault?.address.toString() ?? '';
                document.getElementById('vault-signer')!.textContent =
                  pk.signer?.address ?? '';
                document.getElementById('vault-balance')!.textContent = balance
                  .format()
                  .toString();
                document.getElementById('vault-network')!.textContent =
                  pk.provider.url;
                document.getElementById('faucet')!.hidden = false;

                document
                  .getElementById('faucet')
                  ?.addEventListener('click', () => {
                    pk.getFaucet();
                  });
              });

              document.getElementById('vault-sendTransaction')!.hidden = false;
            }
          });
        });
      });

      passkeysContainer?.appendChild(option);
    });
  });
};

async function initialize() {
  document
    .getElementById('vault-sendTransaction')
    ?.addEventListener('click', send_tx);

  document.addEventListener('DOMContentLoaded', () => loadPk());

  const p = await _p;

  document.getElementById('createAccount')?.addEventListener('click', () =>
    p
      .createAccount('username')
      .then(async (account: any) => {
        document.getElementById('user-address')!.textContent =
          account.passkeyAddress;
        document.getElementById('user-pk')!.textContent = account.publicKey;

        document.getElementById('user-id')!.textContent = account.id;

        document.getElementById('user-info')?.childNodes.forEach((el) => {
          if (el instanceof HTMLElement) {
            el.hidden = false;
          }
        });

        const pk = await _p;

        console.log(account);

        const as = await pk.connect(account.id);
        console.log('as', as);

        if (pk.isConnected()) {
          pk.vault?.getBalance().then((balance: any) => {
            document.getElementById('vault-address')!.textContent =
              pk.vault?.address.toString() ?? '';
            document.getElementById('vault-signer')!.textContent =
              pk.signer?.address ?? '';
            document.getElementById('vault-balance')!.textContent = balance
              .format()
              .toString();
            document.getElementById('vault-network')!.textContent =
              pk.provider.url;
            document.getElementById('faucet')!.hidden = false;

            document.getElementById('faucet')?.addEventListener('click', () => {
              pk.getFaucet();
            });
          });

          document.getElementById('vault-sendTransaction')!.hidden = false;

          loadPk();
        }
      })
      .catch((error: any) => {
        console.error('Error creating account:', error);
      }),
  );
}

initialize();
