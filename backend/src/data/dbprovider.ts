import { LilDbStorageManager } from "../dannso/lildb/common";
import { LilDbStorageManagerSqliteDirectory } from "../dannso/lildb/sqlite";
import { DbAuthSecret, DbPoolSpec, DbUserProfile } from "./types";

export const lilDbs: LilDbStorageManager = new LilDbStorageManagerSqliteDirectory(`data`);

const userProfileDb_ = lilDbs.open<DbUserProfile>("users");
const authSecrets_ = lilDbs.open<DbAuthSecret>("authsecrets");
const poolsDb_ = lilDbs.open<DbPoolSpec>("pools");

export function userProfilesDb() {
  return userProfileDb_;
}

export function authSecrets() {
  return authSecrets_;
}

export function poolsDb() {
  return poolsDb_;
}
