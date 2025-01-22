import { POPUP_CONFIG, POPUP_URL } from '../constants';

export const makeUrlPopup = (
  action: string,
  sessionId: string,
  requestId: string,
  width = POPUP_CONFIG.WIDTH,
  height = POPUP_CONFIG.HEIGHT,
) => {
  const left = (window.innerWidth - width) / 2;
  const top = (window.innerHeight - height) / 2;
  const popup = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`;

  const url = `${POPUP_URL}?action=${action}&requestId=${requestId}&sessionId=${sessionId}`;

  return { url, popup };
};
