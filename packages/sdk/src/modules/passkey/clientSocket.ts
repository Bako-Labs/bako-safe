import { io, Socket } from 'socket.io-client';
import { IMessage, ISendMessage, SocketEvents, SocketUsernames } from './types';
import { sessionId, origin } from './utils';
import { SOCKET_URL } from './constants';

export class SocketClient {
  _socket: Socket;
  request_id: string;

  constructor(
    username: SocketUsernames = SocketUsernames.PASSKEY,
    sessionId: string,
    request_id: string = crypto.randomUUID(),
  ) {
    const auth = {
      origin,
      username,
      sessionId,
      data: new Date(),
      request_id,
    };
    this.request_id = request_id;
    this._socket = io(SOCKET_URL, { autoConnect: true, auth });
  }

  sendMessage(message: ISendMessage) {
    this._socket.emit(SocketEvents.DEFAULT, {
      ...message,
      sessionId,
      request_id: this.request_id,
    });
  }

  onMessage(callback: (message: IMessage) => void) {
    const reattachListener = () => {
      this._socket.once(SocketEvents.DEFAULT, (message: IMessage) => {
        callback(message);
        reattachListener();
      });
    };

    reattachListener();
  }

  disconnect() {
    this._socket.disconnect();
  }

  get socket(): Socket {
    return this._socket;
  }
}
