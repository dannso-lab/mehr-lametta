export function Uint8ArrayToHex(buffer: Uint8Array) {
  let s = "";
  const h = "0123456789abcdef";
  const l = buffer.length;

  for (let i = 0; i < l; i++) {
    const v = buffer[i];
    s += h[v >> 4] + h[v & 0x0f];
  }

  return s;
}

export function ArrayBufferToHex(buffer: ArrayBuffer) {
  return Uint8ArrayToHex(new Uint8Array(buffer));
}

export function HexToUint8Array(s: string): Uint8Array {
  const l = s.length;
  const arr = new Uint8Array((l / 2) | 0);

  for (let i = 0, j = 0; i < l; i += 2, j++) {
    arr[j] = parseInt(s.substring(i, i + 2), 16);
  }
  return arr;
}

export function HexToArrayBuffer(s: string): ArrayBuffer {
  return HexToUint8Array(s).buffer;
}
