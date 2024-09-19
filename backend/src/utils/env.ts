function getEnv(key: string): string | undefined {
  return process.env[key];
}

export function envInt(key: string, defaultValue: number): number {
  if (getEnv(key)) {
    return parseInt(getEnv(key));
  }
  return defaultValue;
}

export function envStr(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export function envBool(key: string, defaultValue: boolean): boolean {
  const value = getEnv(key);
  if (value) {
    if (value === "1") {
      return true;
    }
    if (value.toLowerCase() === "true") {
      return true;
    }
    return false;
  }
  return defaultValue;
}
