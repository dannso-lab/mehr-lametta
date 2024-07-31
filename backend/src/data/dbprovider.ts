import { LilDbStorageManager } from "../dannso/lildb/common";
import {
  LilDbStorageManagerSqliteDirectory,
  LilDbStorageManagerSqliteInMemory,
} from "../dannso/lildb/sqlite";
import { DbUserProfile } from "./types";

export const lilDbs: LilDbStorageManager =
  new LilDbStorageManagerSqliteDirectory(`data`);

const userProfileDb_ = lilDbs.open<DbUserProfile>("users");

export function userProfilesDb() {
  return userProfileDb_;
}
