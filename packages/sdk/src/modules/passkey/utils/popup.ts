export class Popup {
  private popup: Window | null = null;
  private url: string;
  private params: string;

  /**
   * Constructor that initializes and opens the popup window.
   * @param url - The URL to be loaded in the popup.
   * @param params - Configuration parameters for the popup (e.g., size, position).
   */
  constructor(url: string, params: string) {
    this.url = url;
    this.params = params;
    this.openPopup();
  }

  /**
   * Opens the popup window.
   */
  private openPopup() {
    this.destroyPopup();

    this.popup = window.open(this.url, '_blank', this.params);

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

  /**
   * Closes the popup window.
   */
  destroyPopup() {
    if (this.popup && !this.popup.closed) {
      this.popup.close();
      this.popup = null;
    }
  }

  /**
   * Checks if the popup is currently open.
   * @returns {boolean} - True if the popup is open, false otherwise.
   */
  isOpen(): boolean {
    return !!this.popup && !this.popup.closed;
  }

  /**
   * Sends a message to the popup window.
   * @param message - The message to be sent to the popup.
   */
  sendMessage(message: any) {
    if (!this.isOpen() || !this.popup) {
      console.warn('Popup is not open. Cannot send message.');
      return;
    }

    setTimeout(() => {
      if (!this.popup) return;
      this.popup?.postMessage(message, this.popup.location.origin);
    }, 1000);
  }

  /**
   * Listens for messages from the popup window.
   * @param callback - A callback function to handle received messages.
   */
  onMessage(callback: (event: MessageEvent) => void) {
    if (!this.popup) return;

    console.log('Listening for messages from popup...');

    window.addEventListener('message', (event) => {
      if (event.source === this.popup) {
        callback(event);
      }
    });
  }
}
