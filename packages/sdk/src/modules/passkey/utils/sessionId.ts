import { WINDOW, SESSION_ID_KEY } from './constants';

export const gen_session = () => {
  const sessionId = crypto.randomUUID();

  WINDOW?.localStorage.setItem(SESSION_ID_KEY, sessionId);

  return sessionId;
};

export const sessionId =
  WINDOW?.localStorage.getItem(SESSION_ID_KEY) ?? gen_session();
