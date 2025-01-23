export const HAS_WINDOW = typeof window !== 'undefined';
export const WINDOW: any = HAS_WINDOW ? window : {};
export const SESSION_ID_KEY = 'bakosafe/passkey/sessionid';
export const HARDWARE_ID_KEY = 'bakosafe/passkey/hardwareid';
export const PASSKEY_ID_KEY = 'bakosafe/passkey/passkey';

export const SOCKET_URL = 'http://localhost:3001';
export const HTTP_URL = 'http://localhost:3333';
export const POPUP_URL = 'https://test-passkey-theta.vercel.app/bakoui.html';

export const MESSAGE_ALLOW_ORIGIN = 'https://test-passkey-theta.vercel.app';

export const POPUP_CONFIG = {
  WIDTH: 500,
  HEIGHT: 600,
};
