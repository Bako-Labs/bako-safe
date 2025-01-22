const STORAGE_PREFIX = 'bakopasskey_';

export enum StorageKeys {
  SESSION = `${STORAGE_PREFIX}sessionid`,
  HARDWARE = `${STORAGE_PREFIX}hardwareid`,
  PASSKEY = `${STORAGE_PREFIX}passkey`,
  ACTIVE_SESSION = `${STORAGE_PREFIX}activesession`,
}

export type Item = [string, string];

export interface IStorage {
  isAvailable(): Promise<boolean>;
  getItem(key: string): Promise<string | null>;
  setItem(items: Item[]): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

export class Storage implements IStorage {
  constructor() {}

  async isAvailable(): Promise<boolean> {
    const testKey = '__test__';
    const testValue = 'test';
    await this.setItem([[testKey, testValue]]);
    const item = window.localStorage.getItem(testKey);
    if (item !== testValue) {
      return false;
    }

    window.localStorage.removeItem(testKey);

    return true;
  }

  async getItem(key: string): Promise<string | null> {
    return window.localStorage.getItem(key);
  }

  async setItem(items: Item[]): Promise<void> {
    items.forEach(([key, value]) => {
      window.localStorage.setItem(key, value);
    });
  }

  async removeItem(key: string): Promise<void> {
    if (!key.includes(STORAGE_PREFIX)) return;
    window.localStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    Object.keys(window.localStorage).forEach((key) => {
      if (key.includes(STORAGE_PREFIX)) {
        window.localStorage.removeItem(key);
      }
    });
  }
}
