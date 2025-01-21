import { PopupActions } from './types';

export type PopupConfig = {
  url: string;
  width: number;
  height: number;
  requestId: string;
  sessionId: string;
  action: PopupActions;
};

export class Popup {
  popup: Window | null = null;
  url: string;
  width: number;
  height: number;
  requestId: string;
  sessionId: string;
  action: PopupActions;

  constructor({
    url,
    width,
    height,
    requestId,
    sessionId,
    action,
  }: PopupConfig) {
    this.url = url;
    this.width = width;
    this.height = height;
    this.requestId = requestId;
    this.sessionId = sessionId;
    this.action = action;
  }

  createPopup() {
    this.destroyPopup();

    const left = window.screenX + (window.innerWidth - this.width) / 2;
    const top = window.screenY + (window.innerHeight - this.height) / 2;

    this.popup = window.open(
      `${this.url}?sessionId=${this.sessionId}&requestId=${this.requestId}&action=${this.action}`,
      '_blank',
      `width=${this.width},height=${this.height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
    );

    if (!this.popup) {
      throw new Error(
        'Não foi possível abrir a popup. Certifique-se de que pop-ups não estão bloqueadas pelo navegador.',
      );
    }
  }

  destroyPopup() {
    if (this.popup && !this.popup.closed) {
      this.popup.close();
      this.popup = null;
    }
  }

  reloadPopup() {
    this.createPopup();
  }
}
