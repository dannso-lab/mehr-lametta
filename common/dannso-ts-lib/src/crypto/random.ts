import { Uint8ArrayToHex } from "./encoding";
import { nativeCrypto } from "./native";

export const secureRandomBytes: (nbytes: number) => Uint8Array =
  nativeCrypto.getRandomValues
    ? function secureRandomBytes(nbytes: number) {
        const buf = new Uint8Array(nbytes);
        nativeCrypto.getRandomValues(buf);
        return buf;
      }
    : function secureRandomBytes(nbytes: number) {
        const buf = (nativeCrypto as any).randomBytes(nbytes);
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
      };

export function secureRandomId() {
  return Uint8ArrayToHex(secureRandomBytes(16));
}
