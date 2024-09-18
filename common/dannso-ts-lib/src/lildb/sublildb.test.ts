import { expect, test, suite, expectTypeOf } from "vitest";
import { LilDbStorageManagerMemory } from "./memory";
import { SubLilDb } from "./sublildb";

suite("subkeyed lildb", () => {
  test("non interference on differently keyed sub dbs", async () => {
    type FooItem = {
      foo: string;
    };
    // GIVEN
    const rootDb = await new LilDbStorageManagerMemory().open<FooItem>("db");
    const dbA = new SubLilDb(rootDb, "a");
    const dbB = new SubLilDb(rootDb, "b");

    // WHEN
    dbA.put("sameKey", { foo: "from a" });
    dbB.put("sameKey", { foo: "from b" });
    const resA = await dbA.query({ selector: { $id: "sameKey" } });
    const resB = await dbB.query({ selector: { $id: "sameKey" } });

    // THEN
    expect(resA.values.length).toBe(1);
    expect(resA.values[0].value).toStrictEqual({ foo: "from a" });
    expect(resA.values[0].id).toBe("sameKey");

    expect(resB.values.length).toBe(1);
    expect(resB.values[0].value).toStrictEqual({ foo: "from b" });
    expect(resB.values[0].id).toBe("sameKey");
  });

  test("non interference with compound id selector that already contains $start", async () => {
    type FooItem = {
      foo: string;
    };
    // GIVEN
    const rootDb = await new LilDbStorageManagerMemory().open<FooItem>("db");
    const dbA = new SubLilDb(rootDb, "a");
    const dbB = new SubLilDb(rootDb, "b");

    // WHEN
    dbA.put("sameKey", { foo: "from a" });
    dbB.put("sameKey", { foo: "from b" });
    const resA = await dbA.findOne({ $id: { $starts: "sameK" } });
    const resB = await dbB.findOne({ $id: { $starts: "sameK" } });

    // THEN
    expect(resA!.value).toStrictEqual({ foo: "from a" });
    expect(resA!.id).toBe("sameKey");

    expect(resB!.value).toStrictEqual({ foo: "from b" });
    expect(resB!.id).toBe("sameKey");
  });

  test("non interference with no id selector but selector on object", async () => {
    type FooItem = {
      foo: string;
    };
    // GIVEN
    const rootDb = await new LilDbStorageManagerMemory().open<FooItem>("db");
    const dbA = new SubLilDb(rootDb, "a");
    const dbB = new SubLilDb(rootDb, "b");

    // WHEN
    dbA.put("sameKey", { foo: "from a" });
    dbB.put("sameKey", { foo: "from b" });
    const resA = await dbA.findOne({ foo: { $starts: "from" } });
    const resB = await dbB.findOne({ foo: { $starts: "from" } });

    // THEN
    expect(resA!.value).toStrictEqual({ foo: "from a" });
    expect(resA!.id).toBe("sameKey");

    expect(resB!.value).toStrictEqual({ foo: "from b" });
    expect(resB!.id).toBe("sameKey");
  });
});
