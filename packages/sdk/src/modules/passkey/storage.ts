/**
 * Prefix used for all storage keys to avoid conflicts.
 */
const STORAGE_PREFIX = 'bakopasskey_';

/**
 * Enum representing the keys used for local storage in the application.
 */
export enum StorageKeys {
  /**
   * Key for the session ID.
   */
  SESSION = `${STORAGE_PREFIX}sessionid`,

  /**
   * Key for the hardware ID.
   */
  HARDWARE = `${STORAGE_PREFIX}hardwareid`,

  /**
   * Key for passkey storage.
   */
  PASSKEY = `${STORAGE_PREFIX}passkey`,

  /**
   * Key for the active session.
   */
  ACTIVE_SESSION = `${STORAGE_PREFIX}activesession`,
}

/**
 * Type definition for a storage item consisting of a key-value pair.
 */
export type Item = [string, string];

/**
 * Interface for the storage mechanism used in the application.
 */
export interface IStorage {
  /**
   * Checks if the storage is available and functional.
   * @returns {Promise<boolean>} - True if storage is available, otherwise false.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Retrieves an item from storage.
   * @param {string} key - The key of the item to retrieve.
   * @returns {Promise<string | null>} - The stored value, or null if not found.
   */
  getItem(key: string): Promise<string | null>;

  /**
   * Stores one or more items in storage.
   * @param {Item[]} items - Array of key-value pairs to store.
   * @returns {Promise<void>} - Resolves when the items are stored.
   */
  setItem(items: Item[]): Promise<void>;

  /**
   * Removes an item from storage.
   * @param {string} key - The key of the item to remove.
   * @returns {Promise<void>} - Resolves when the item is removed.
   */
  removeItem(key: string): Promise<void>;

  /**
   * Clears all items from storage that use the specified prefix.
   * @returns {Promise<void>} - Resolves when storage is cleared.
   */
  clear(): Promise<void>;
}

/**
 * Class implementing the IStorage interface, providing a wrapper around localStorage.
 */
export class Storage implements IStorage {
  constructor() {}

  /**
   * Checks if localStorage is available and functional.
   * Writes a test key-value pair, retrieves it, and deletes it.
   * @returns {Promise<boolean>} - True if localStorage is available, otherwise false.
   */
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

  /**
   * Retrieves an item from localStorage.
   * @param {string} key - The key of the item to retrieve.
   * @returns {Promise<string | null>} - The value associated with the key, or null if not found.
   */
  async getItem(key: string): Promise<string | null> {
    return window.localStorage.getItem(key);
  }

  /**
   * Stores one or more key-value pairs in localStorage.
   * @param {Item[]} items - Array of key-value pairs to store.
   * @returns {Promise<void>} - Resolves when the items are stored.
   */
  async setItem(items: Item[]): Promise<void> {
    items.forEach(([key, value]) => {
      window.localStorage.setItem(key, value);
    });
  }

  /**
   * Removes an item from localStorage by its key.
   * Only keys with the correct prefix are allowed to be removed.
   * @param {string} key - The key of the item to remove.
   * @returns {Promise<void>} - Resolves when the item is removed.
   */
  async removeItem(key: string): Promise<void> {
    if (!key.includes(STORAGE_PREFIX)) return;
    window.localStorage.removeItem(key);
  }

  /**
   * Clears all items from localStorage that use the specified prefix.
   * @returns {Promise<void>} - Resolves when storage is cleared.
   */
  async clear(): Promise<void> {
    Object.keys(window.localStorage).forEach((key) => {
      if (key.includes(STORAGE_PREFIX)) {
        window.localStorage.removeItem(key);
      }
    });
  }
}
