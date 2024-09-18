import { expect, test, suite, expectTypeOf } from "vitest";

import { LilDb, LilDbStorageManager } from "./common";

import { LilDbMemory, LilDbStorageManagerMemory } from "./memory";
import { LilDbStorageManagerSqliteInMemory } from "./sqlite";
import { JSONValue } from "../data/json";
import { SubLilDb } from "./sublildb";

type Animal = {
  animal: string;
  num: number;
};

async function inserTestData(db: LilDb<Animal>) {
  await db.put("id7", {
    animal: "Antelope",
    num: 1,
  });
  await db.put("id9", {
    animal: "Bear",
    num: 7,
  });
  await db.put("id0", {
    animal: "Cheetah",
    num: 0,
  });
  await db.put("id4", {
    animal: "Dolphin",
    num: 9,
  });
  await db.put("id5", {
    animal: "Elephant",
    num: 5,
  });
  await db.put("id1", {
    animal: "Flamingo",
    num: 4,
  });
  await db.put("id6", {
    animal: "Giraffe",
    num: 10,
  });
  await db.put("id2", {
    animal: "Hippo",
    num: 6,
  });
  await db.put("id10", {
    animal: "Iguana",
    num: 2,
  });
  await db.put("id3", {
    animal: "Jaguar",
    num: 3,
  });
}

function testForStorageManager(
  storageName: string,
  storageManager: LilDbStorageManager
) {
  suite(storageName, () => {
    test("a fresh database starts with zero transactions", async () => {
      expect(await (await storageManager.open("fresh")).currentTx()).toBe(0);
    });

    test("simple interactions with one key work as expected", async () => {
      const db = await storageManager.open("1key");
      // 1
      expect(await db.findOne({ $id: "mykey" })).toBe(null);
      // 2
      await db.put("mykey", { foo: "bar" });
      expect(await db.findOne({ $id: "mykey" })).toStrictEqual({
        id: "mykey",
        value: {
          foo: "bar",
        },
        tx: 1,
        revision: 0,
        isTombstoned: false,
      });
      // 3
      await db.put("mykey", { foo: "kram" });
      expect(await db.findOne({ $id: "mykey" })).toStrictEqual({
        id: "mykey",
        value: {
          foo: "kram",
        },
        tx: 2,
        revision: 1,
        isTombstoned: false,
      });
    });

    test("simple interactions with two keys work as expected", async () => {
      const db = await storageManager.open("2key");
      // 1
      expect(await db.findOne({ $id: "mykey1" })).toBe(null);
      // 2
      await db.put("mykey1", { foo: "bar1" });
      await db.put("mykey2", { foo: "bar2" });
      expect(await db.findOne({ $id: "mykey1" })).toStrictEqual({
        id: "mykey1",
        value: {
          foo: "bar1",
        },
        tx: 1,
        revision: 0,
        isTombstoned: false,
      });
      expect(await db.findOne({ $id: "mykey2" })).toStrictEqual({
        id: "mykey2",
        value: {
          foo: "bar2",
        },
        tx: 2,
        revision: 0,
        isTombstoned: false,
      });
      // 3
      await db.put("mykey1", { foo: "kram" });
      expect(await db.findOne({ $id: "mykey1" })).toStrictEqual({
        id: "mykey1",
        value: {
          foo: "kram",
        },
        tx: 3,
        revision: 1,

        isTombstoned: false,
      });
      expect(await db.findOne({ $id: "mykey2" })).toStrictEqual({
        id: "mykey2",
        value: {
          foo: "bar2",
        },
        tx: 2,
        revision: 0,

        isTombstoned: false,
      });
    });

    test("sorting for string property works", async () => {
      const db = await storageManager.open<Animal>("sortStringProperty");
      await inserTestData(db);
      // normal sort
      expect(
        (await db.query({ selector: {}, sort: ["animal"] })).values.map(
          (doc) => doc.value.animal
        )
      ).toStrictEqual([
        "Antelope",
        "Bear",
        "Cheetah",
        "Dolphin",
        "Elephant",
        "Flamingo",
        "Giraffe",
        "Hippo",
        "Iguana",
        "Jaguar",
      ]);
      // reverse
      expect(
        (
          await db.query({ selector: {}, sort: ["animal"], reverse: true })
        ).values.map((doc) => doc.value.animal)
      ).toStrictEqual([
        "Jaguar",
        "Iguana",
        "Hippo",
        "Giraffe",
        "Flamingo",
        "Elephant",
        "Dolphin",
        "Cheetah",
        "Bear",
        "Antelope",
      ]);
      expect(
        (
          await db.query({ selector: {}, sort: ["animal"], reverse: true })
        ).values.map((doc) => doc.value.num)
      ).toStrictEqual([3, 2, 6, 10, 4, 5, 9, 0, 7, 1]);
      expect(
        (
          await db.query({ selector: {}, sort: ["animal"], reverse: true })
        ).values.map((doc) => doc.id)
      ).toStrictEqual([
        "id3",
        "id10",
        "id2",
        "id6",
        "id1",
        "id5",
        "id4",
        "id0",
        "id9",
        "id7",
      ]);

      // select subset
      expect(
        (
          await db.query({
            selector: { animal: { $gt: "Bear", $lt: "Giraffe" } },
            sort: ["animal"],
          })
        ).values.map((doc) => doc.value.animal)
      ).toStrictEqual(["Cheetah", "Dolphin", "Elephant", "Flamingo"]);
      expect(
        (
          await db.query({
            selector: { animal: { $gt: "Bear", $lt: "Giraffe" } },
            sort: ["animal"],
          })
        ).values.map((doc) => doc.value.num)
      ).toStrictEqual([0, 9, 5, 4]);

      expect(
        (
          await db.query({
            selector: { animal: { $gt: "Bear", $lt: "Giraffe" } },
            sort: ["animal"],
            reverse: true,
          })
        ).values.map((doc) => doc.value.animal)
      ).toStrictEqual(["Flamingo", "Elephant", "Dolphin", "Cheetah"]);
    });
  });

  test("sorting for number property works", async () => {
    const db = await storageManager.open<Animal>("sortNumberProperty");
    await inserTestData(db);
    // normal sort
    expect(
      (await db.query({ selector: {}, sort: ["num"] })).values.map(
        (doc) => doc.value.num
      )
    ).toStrictEqual([0, 1, 2, 3, 4, 5, 6, 7, 9, 10]);
    // reverse sort
    expect(
      (
        await db.query({ selector: {}, sort: ["num"], reverse: true })
      ).values.map((doc) => doc.value.num)
    ).toStrictEqual([10, 9, 7, 6, 5, 4, 3, 2, 1, 0]);
    // with filtering
    expect(
      (
        await db.query({ selector: { num: { $gt: 2, $lt: 5 } }, sort: ["num"] })
      ).values.map((doc) => doc.value.num)
    ).toStrictEqual([3, 4]);
    expect(
      (
        await db.query({ selector: { num: { $gt: 2, $lt: 5 } }, sort: ["num"] })
      ).values.map((doc) => doc.value.animal)
    ).toStrictEqual(["Jaguar", "Flamingo"]);
  });

  test("starts with accessor works", async () => {
    // GIVEN
    const db = await storageManager.open<Animal>("startsWith");
    await db.put("ab", {
      animal: "AbSoweli",
      num: 0,
    });
    await db.put("abc", {
      animal: "AbcSoweli",
      num: 1,
    });
    await db.put("abcdef", {
      animal: "AbcdefSoweli",
      num: 2,
    });
    await db.put("zyx", {
      animal: "XyzSoweli",
      num: 3,
    });

    // WHEN, THEN
    expect(
      (
        await db.query({ selector: { $id: { $starts: "abc" } }, sort: ["num"] })
      ).values.map((doc) => doc.id)
    ).toStrictEqual(["abc", "abcdef"]);
  });

  test("basic paging works", async () => {
    const db = await storageManager.open<Animal>("basicPaging");
    await inserTestData(db);
    const resA = await db.query({
      selector: {},
      sort: ["animal"],
      page: 0,
      limit: 2,
    });
    //expect(resA.numberOfValuesTotal).toBe(10);
    expect(resA.values.map((doc) => doc.value.animal)).toStrictEqual([
      "Antelope",
      "Bear",
    ]);
    const resB = await db.query({
      selector: {},
      sort: ["animal"],
      page: 1,
      limit: 2,
    });
    //expect(resB.numberOfValuesTotal).toBe(10);
    expect(resB.values.map((doc) => doc.value.animal)).toStrictEqual([
      "Cheetah",
      "Dolphin",
    ]);
  });

  test("paging works with subset selected", async () => {
    const db = await storageManager.open<Animal>("paginWithSubset");
    await inserTestData(db);
    const resA = await db.query({
      selector: { animal: { $gt: "Elephant" } },
      sort: ["animal"],
      page: 0,
      limit: 2,
    });
    //expect(resA.numberOfValuesTotal).toBe(5);
    expect(resA.values.map((doc) => doc.value.animal)).toStrictEqual([
      "Flamingo",
      "Giraffe",
    ]);
    const resB = await db.query({
      selector: { animal: { $gt: "Elephant" } },
      sort: ["animal"],
      page: 1,
      limit: 2,
    });
    //expect(resB.numberOfValuesTotal).toBe(5);
    expect(resB.values.map((doc) => doc.value.animal)).toStrictEqual([
      "Hippo",
      "Iguana",
    ]);
    const resC = await db.query({
      selector: { animal: { $gt: "Elephant" } },
      sort: ["animal"],
      page: 2,
      limit: 2,
    });
    //expect(resC.numberOfValuesTotal).toBe(5);
    expect(resC.values.map((doc) => doc.value.animal)).toStrictEqual([
      "Jaguar",
    ]);

    const resD = await db.query({
      selector: { animal: { $gt: "Elephant" } },
      sort: ["animal"],
      page: 3,
      limit: 2,
    });
    //expect(resD.numberOfValuesTotal).toBe(5);
    expect(resD.values.map((doc) => doc.value.animal)).toStrictEqual([]);
  });

  test("basic deletion functionality", async () => {
    // given
    const db = await storageManager.open<Animal>("deletion-basic");
    await inserTestData(db);
    expect(await db.findOne({ $id: "id10" })).not.toBeNull();
    //when
    await db.delete("id10");
    //then
    expect(await db.findOne({ $id: "id10" })).toBeNull();
  });

  test("find tombstoned deletions", async () => {
    // given
    const db = await storageManager.open<Animal>("deletion-with-tombstone");
    await inserTestData(db);
    await db.put("delete-id", {
      animal: "SwryIBeGoneSoon",
      num: 12345,
    });
    const originalDoc = await db.findOne({ $id: "delete-id" });
    expect(originalDoc).not.toBeNull();
    expect(await db.findOne({ $id: "id10" })).not.toBeNull();
    //when
    await db.delete("delete-id");
    //then
    const withTombStone = await db.query({
      selector: { $id: "delete-id" },
      includeTombstoned: true,
    });
    expect(withTombStone.values.length).toBe(1);
    const tombStonedDocument = withTombStone.values[0];
    // let's also check that revisions and tx advance  as well
    expect(tombStonedDocument.revision).toEqual(originalDoc!.revision + 1);
    expect(tombStonedDocument.tx).toEqual(originalDoc!.tx + 1);
  });

  test("set and get meta", async () => {
    const db = await storageManager.open<Animal>("meta-set-get");
    await db.setMeta("foo", { bar: 42 });
    expect(await db.getMeta("foo")).toEqual({ bar: 42 });
    await db.setMeta("foo", { bar: 32 });
    expect(await db.getMeta("foo")).toEqual({ bar: 32 });
    expect(await db.getMeta("non existent")).toBeNull();
  });

  test("set and get meta simple string", async () => {
    const db = await storageManager.open<Animal>("meta-set-get-string");
    await db.setMeta("foo", "bar");
    expect(await db.getMeta("foo")).toBe("bar");
  });
}

testForStorageManager("lildb in-memory", new LilDbStorageManagerMemory());
testForStorageManager(
  "sqlite in-memory",
  new LilDbStorageManagerSqliteInMemory()
);

// This test basically says:
// GIVEN: If you have a subkeyed lildb... and there's only ever one key used
// THEN: it should behave like a normal db
// ... this is a sanity check
// the only difference between subkeyed single instance lildb and one with many is the transaction counts
class LilDbSingleInstanceStorageManager implements LilDbStorageManager {
  async open<ValueType extends JSONValue>(
    name: string
  ): Promise<LilDb<ValueType>> {
    const rootDb = new LilDbMemory<ValueType>();
    return new SubLilDb(rootDb, "mySubKey");
  }
}
testForStorageManager(
  "subkeyed lildb single instance",
  new LilDbSingleInstanceStorageManager()
);
