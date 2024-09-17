export function stringq(x: any) {
  if (typeof x === "string") {
    return true;
  }

  if (typeof x !== "object") {
    return false;
  }

  if (Object.prototype.toString.call(x) === "[object String]") {
    return true;
  }
  return false;
}
