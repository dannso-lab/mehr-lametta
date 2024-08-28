import { LilDbStorageManager } from "../dannso/lildb/common";
import { LilDbStorageManagerSqliteDirectory, LilDbStorageManagerSqliteInMemory } from "../dannso/lildb/sqlite";
import { DbAuthSecret, DbUserProfile } from "./types";

export const lilDbs: LilDbStorageManager = new LilDbStorageManagerSqliteDirectory(`data`);

const userProfileDb_ = lilDbs.open<DbUserProfile>("users");
const authSecrets_ = lilDbs.open<DbAuthSecret>("authsecrets");

export function userProfilesDb() {
  return userProfileDb_;
}

export function authSecrets() {
  return authSecrets_;
}
