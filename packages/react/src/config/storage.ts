const prefix = `BAKO_PASSKEY_KIT/`;

export enum StorageKey {
  SERVER_URL = `${prefix}server_url`,

  USER_ADDRESS = `${prefix}user_address`,
  USER_TOKEN = `${prefix}user_token`,
  USER_CHALLENGE = `${prefix}user_challenge`,

  WEBAUTH_HARDWARE = `${prefix}webauth_hardware`,
}

interface IStorage {
  name: StorageKey;
  value: string;
}

export class Storage {
  static set(data: IStorage | IStorage[]) {
    const isMultiple = Array.isArray(data);
    return isMultiple
      ? data.forEach(({ name, value }) => localStorage.setItem(name, value))
      : localStorage.setItem(data.name, data.value);
  }

  static get(name: StorageKey) {
    return localStorage.getItem(name) ?? '';
  }

  static remove(name: StorageKey) {
    localStorage.removeItem(name);
  }

  static clear() {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}
