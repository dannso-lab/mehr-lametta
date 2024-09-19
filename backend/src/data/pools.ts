import { Context } from "../context";
import { secureRandomId } from "../dannso/crypto/random";

export async function listPools(context: Context) {
  const allPools = await context.dbPools.query({ selector: {} });
  return allPools.values;
}

export async function createPool(context: Context, label: string) {
  const id = secureRandomId();
  await context.dbPools.put(id, {
    createdAt: Date.now(),
    label,
  });
  return id;
}
