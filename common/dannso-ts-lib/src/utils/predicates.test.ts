import { expect, test, suite } from "vitest";
import { stringq } from "./predicates";

suite("predicates", () => {
  test("stringq", () => {
    // strings
    expect(stringq("hello world")).toBe(true);
    expect(stringq("")).toBe(true);
    expect(stringq(new String("foo bar"))).toBe(true);
    expect(stringq(Object("foo bar"))).toBe(true);

    // non-strings
    expect(stringq(100)).toBe(false);
    expect(stringq(null)).toBe(false);
    expect(stringq(undefined)).toBe(false);
    expect(stringq([])).toBe(false);
    expect(stringq({})).toBe(false);
    expect(stringq(/findstuff/)).toBe(false);
    expect(stringq(true)).toBe(false);
    expect(stringq(false)).toBe(false);
    expect(stringq(Symbol("kram"))).toBe(false);
    expect(stringq(BigInt(123))).toBe(false);
  });
});
