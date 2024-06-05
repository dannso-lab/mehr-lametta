function getNativeCrypto(): Crypto {
  if (typeof window !== "undefined" && window.crypto) {
    return window.crypto;
  } else if (typeof crypto !== "undefined") {
    return crypto;
  } else {
    return require("crypto");
  }
}

export const nativeCrypto = getNativeCrypto();
