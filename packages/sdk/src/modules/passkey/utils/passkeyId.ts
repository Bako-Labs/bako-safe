import { WINDOW, PASSKEY_ID_KEY } from '../constants';

export const listPasskeys = () => {
  return JSON.parse(WINDOW?.localStorage.getItem(PASSKEY_ID_KEY) ?? '[]');
};

export const addPasskey = (id: string, passkey: Record<string, string>) => {
  const passkeys = listPasskeys();
  passkeys.push({ id, passkey });
  WINDOW?.localStorage.setItem(PASSKEY_ID_KEY, JSON.stringify(passkeys));

  return passkeys;
};
