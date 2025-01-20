import { JSONRPCServer } from 'json-rpc-2.0';
import { createAccount, sha256, signChallange } from 'bakosafe';

export type User = {
  address: string;
  id: string;
  publicKey: string;
}

// Convert a byte array to a hex string
function bytesToHex(bytes: Uint8Array) {
    let hex = [];
    for (let i = 0; i < bytes.length; i++) {
        let current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
        hex.push((current >>> 4).toString(16));
        hex.push((current & 0xF).toString(16));
    }
    return `0x${hex.join("")}`;
}

export class SDKServer {
  server: JSONRPCServer;

  constructor() {
    this.server = new JSONRPCServer();
    this.server.addMethod('signMessage', async ([challange]: [string]) => {
      const user = this.retrieveUserData();
      if (!user) {
        throw new Error('User not registered');
      }
      const bytes = (new TextEncoder()).encode(challange);
      const hash = await sha256(bytes);
      return signChallange(user.id, bytesToHex(hash), user.publicKey);
    });
    this.server.addMethod('isRegistered', async () => {
      const user = this.retrieveUserData();
      return !!user;
    });
    this.server.addMethod('getUser', async () => {
      return this.retrieveUserData();
    });
  }

  async register() {
    const data = await createAccount('stacio', bytesToHex(crypto.getRandomValues(new Uint8Array(32))));
    const user = {
      id: data.credential?.id,
      address: data.address,
      publicKey: data.publicKeyHex
    };
    localStorage.setItem('data-auth', JSON.stringify(user));
    return user;
  }

  async processMessage(data: any) {
    return this.server.receive(data);
  }

  private retrieveUserData() {
    try {
      return localStorage.getItem('data-auth') ? JSON.parse(localStorage.getItem('data-auth') || '{}') : null
    } catch {
      return null;
    } 
  }
}