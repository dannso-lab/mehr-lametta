import { expect, test } from "vitest";
import { Doc } from "./common";
import { buildAssertionTester, buildPathAccessor } from "./utils";

test("path accessor", () => {
  const doc: Doc = {
    id: "id123",
    revision: 33,
    tx: 42,
    value: {
      foo: "bar",
      deep: {
        obj: "is deep",
        deeper: {
          even: "deeper",
        },
      },
    },
  };

  expect(buildPathAccessor("$id")(doc)).toBe("id123");
  expect(buildPathAccessor("$rev")(doc)).toBe(33);
  expect(buildPathAccessor("$tx")(doc)).toBe(42);
  expect(buildPathAccessor("foo")(doc)).toBe("bar");
  expect(buildPathAccessor("deep.obj")(doc)).toBe("is deep");
  expect(buildPathAccessor("deep.deeper.even")(doc)).toBe("deeper");
});

test("value assertions", () => {
  expect(buildAssertionTester("foo")("foo")).toBe(true);
  expect(buildAssertionTester("bar")("foo")).toBe(false);

  expect(buildAssertionTester({ $eq: 42 })(42)).toBe(true);
  // gt
  expect(buildAssertionTester({ $gt: 42 })(43)).toBe(true);
  expect(buildAssertionTester({ $gt: 42 })(42)).toBe(false);
  expect(buildAssertionTester({ $gt: 42 })(41)).toBe(false);
  // gte
  expect(buildAssertionTester({ $gte: 42 })(43)).toBe(true);
  expect(buildAssertionTester({ $gte: 42 })(42)).toBe(true);
  expect(buildAssertionTester({ $gte: 42 })(41)).toBe(false);
  // lt
  expect(buildAssertionTester({ $lt: 42 })(43)).toBe(false);
  expect(buildAssertionTester({ $lt: 42 })(42)).toBe(false);
  expect(buildAssertionTester({ $lt: 42 })(41)).toBe(true);
  // lte
  expect(buildAssertionTester({ $lte: 42 })(43)).toBe(false);
  expect(buildAssertionTester({ $lte: 42 })(42)).toBe(true);
  expect(buildAssertionTester({ $lte: 42 })(41)).toBe(true);

  // strings
  expect(buildAssertionTester({ $lt: "zebra" })("axolotl")).toBe(true);
  expect(buildAssertionTester({ $gt: "axolotl" })("zebra")).toBe(true);
  expect(buildAssertionTester({ $starts: "axo" })("axolotl")).toBe(true);
  expect(buildAssertionTester({ $starts: "axoX" })("axolotl")).toBe(false);

  // compound expressions
  const between50_100 = buildAssertionTester({ $gte: 50, $lte: 100 });
  expect(between50_100(49)).toBe(false);
  expect(between50_100(50)).toBe(true);
  expect(between50_100(51)).toBe(true);
  expect(between50_100(80)).toBe(true);
  expect(between50_100(99)).toBe(true);
  expect(between50_100(100)).toBe(true);
  expect(between50_100(101)).toBe(false);
});
