import crypto from "node:crypto";
import { secureRandomId } from "../dannso/crypto/random";
import { userProfilesDb } from "./dbprovider";
import { DbUserProfile } from "./types";

async function hashPassword(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    crypto.pbkdf2(
      password,
      salt,
      310000,
      32,
      "sha256",
      function (err, hashedPassword) {
        if (err) {
          reject(err);
        } else {
          resolve(hashedPassword);
        }
      }
    );
  });
}

export async function findUserByName(
  name: string
): Promise<DbUserProfile | null> {
  const users = await userProfilesDb();
  const userDoc = await users.findOne({ $id: name });
  return userDoc ? userDoc.value : null;
}

export async function createUser(name: string, password: string) {
  const users = await userProfilesDb();
  const salt = await secureRandomId();
  const hashedpassword = (await hashPassword(password, salt)).toString("hex");
  await users.put(name, {
    hashedpassword,
    salt,
    name,
  });
}
