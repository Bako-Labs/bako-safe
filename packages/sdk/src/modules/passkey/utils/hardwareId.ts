import { WINDOW, HARDWARE_ID_KEY } from '../constants';

export const gen = () => {
  const hardwareId = crypto.randomUUID();

  WINDOW?.localStorage.setItem(HARDWARE_ID_KEY, hardwareId);

  return hardwareId;
};

export const hardwareId =
  WINDOW?.localStorage.getItem(HARDWARE_ID_KEY) ?? gen();
