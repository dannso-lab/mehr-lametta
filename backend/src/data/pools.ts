import { secureRandomId } from "../dannso/crypto/random";
import { poolsDb } from "./dbprovider";

export async function listPools() {
  const db = await poolsDb();
  const allPools = await db.query({ selector: {} });
  return allPools.values;
}

export async function createPool(label: string) {
  const db = await poolsDb();
  const id = secureRandomId();
  await db.put(id, {
    createdAt: Date.now(),
    label,
  });
  return id;
}
