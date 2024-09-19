import crypto from "node:crypto";
import { secureRandomId } from "../dannso/crypto/random";
import { DbUserProfile } from "./types";
import { Context } from "../context";

export async function hashUserPassword(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    crypto.pbkdf2(password, salt, 310000, 32, "sha256", function (err, hashedPassword) {
      if (err) {
        reject(err);
      } else {
        resolve(hashedPassword);
      }
    });
  });
}

export async function findUserByName(context: Context, name: string): Promise<DbUserProfile | null> {
  const userDoc = await context.dbUserProfile.findOne({ $id: name });
  return userDoc ? userDoc.value : null;
}

export async function createUser(context: Context, name: string, password: string) {
  const salt = await secureRandomId();
  const hashedpassword = (await hashUserPassword(password, salt)).toString("hex");
  await context.dbUserProfile.put(name, {
    hashedpassword,
    salt,
    name,
  });
}
