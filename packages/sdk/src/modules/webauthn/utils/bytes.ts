export function toBase64(buffer: ArrayBuffer | Uint8Array): string {
  const base64 = String.fromCharCode(...new Uint8Array(buffer));
  return base64.replaceAll('+', '-').replaceAll('/', '_');
}

export function fromBase64(base64: string): ArrayBuffer {
  const t = base64.replaceAll('-', '+').replaceAll('_', '/');
  return Uint8Array.from(window.atob(t), (c) => c.charCodeAt(0)).buffer;
}

export function hexToASCII(hex: string): Uint8Array {
  // If it's a hex string, convert it to ASCII
  if (hex.startsWith('0x')) {
    hex = hex.slice(2);
    // Check if it's actually a valid hex string
    if (/^[0-9a-fA-F]+$/.test(hex)) {
      // Convert hex to ASCII
      const bytes = [];
      for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
      }
      return new Uint8Array(bytes);
    }
  }

  // If it's not a hex string, treat it as a regular string and convert to ASCII
  return Uint8Array.from(hex.split('').map((c: string) => c.charCodeAt(0)));
}

export function findIndex(
  bytes: Uint8Array,
  bytesToSearch: Uint8Array,
): number {
  let acc = 0;
  let index = -1;

  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === bytesToSearch[acc]) {
      if (acc === bytesToSearch.length - 1) {
        index = i - acc;
        break;
      }
      acc += 1;
      continue;
    }
    acc = 0;
  }

  return index;
}
