import { Passkey } from 'bakosafe';

const p = new Passkey();

function initialize() {
  document.getElementById('createAccount')?.addEventListener('click', () =>
    p
      .createAccount('username')
      .then((account: any) => {
        console.log('Account created:', account);
        document.getElementById('user-address')!.textContent = account.address;
        document.getElementById('user-pk')!.textContent = account.publicKey;
        document.getElementById('user-id')!.textContent = account.id;
        document.getElementById('user-code')!.textContent = account.challange;
      })
      .catch((error: any) => {
        console.error('Error creating account:', error);
      }),
  );

  document.getElementById('signMessage')?.addEventListener('click', () => {
    p.signMessage(
      document.getElementById('user-code')!.textContent!,
      document.getElementById('user-id')!.textContent!,
      document.getElementById('user-pk')!.textContent!,
    ).then((signature: any) => {
      document.getElementById('user-signature')!.textContent = signature;
    });
  });

  document.addEventListener('DOMContentLoaded', () => {
    const passkeys = p.myPasskeys();

    passkeys.forEach((p: any) => {
      const option = document.createElement('p');
      option.textContent = p.passkey.id;
      document.getElementById('passkeys')!.appendChild(option);
    });
  });
}

initialize();
