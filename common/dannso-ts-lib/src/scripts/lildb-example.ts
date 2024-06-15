import { isConstructorDeclaration } from "typescript";
import { LilDbStorageManagerSqliteInMemory } from "../lildb/sqlite";

//console.log("CURRENT-TX ", await db.currentTx());
async function main() {
  type Foo = {
    msg: string;
  };
  console.log("Create DB");
  const db = await new LilDbStorageManagerSqliteInMemory().open<Foo>("foo");

  console.log("Create Index");
  await db.hintIndex("msgfoo", ["msg", "yeah.foo"]);
  console.log("put 1");
  await db.put("id1", { msg: "hello world3" });
  console.log("put 2");
  await db.put("id2", { msg: "hello world" });
  console.log("put 3");
  await db.put("id1", { msg: "hello world2" });
  console.log("query");
  const allDocs = await db.query({
    selector: {
      //$id: "id1",
      msg: { $gt: "a" },
      "yeah.fooa": {
        $eq: "foo",
      },
    },
    sort: ["msg"],
  });

  console.log(`allDocs`, JSON.stringify(allDocs, null, 2));
}

main();
