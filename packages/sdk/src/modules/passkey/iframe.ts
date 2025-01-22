export class Popup {
  popup: Window | null = null;

  constructor(url: string, params: string) {
    this.destroyPopup();

    this.popup = window.open(url, '_blank', params);

    if (!this.popup) {
      throw new Error('Popup was blocked. Please enable popups and try again.');
    }

    this.popup.onload = () => {
      if (!this.popup) return;
      const body = this.popup.document.body;
      body.style.position = 'fixed';
      body.style.top = '50%';
      body.style.left = '50%';
      body.style.transform = 'translate(-50%, -50%)';
    };
  }

  destroyPopup() {
    if (this.popup && !this.popup.closed) {
      this.popup.close();
      this.popup = null;
    }
  }
}
