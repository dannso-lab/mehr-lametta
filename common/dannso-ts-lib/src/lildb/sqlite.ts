import { secureRandomId } from "../crypto/random";
import { JSONValue } from "../data/json";

import {
  DEFAULT_PAGINATION_LIMIT,
  Doc,
  LilDb,
  LilDbStorageManager,
  Query,
  QueryResult,
} from "./common";
import sqlite3 from "sqlite3";
import { stringq } from "../utils/predicates";

import fs from "node:fs";

function sqlrun(db: sqlite3.Database, sql: string, params: string[] = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve(undefined);
      }
    });
  });
}

async function loadDb(db: sqlite3.Database) {
  await sqlrun(
    db,
    "create table if not exists docs (id TEXT PRIMARY KEY, tx INTEGER, revision INTEGER, val JSON, tombstone INTEGER)"
  );
  await sqlrun(
    db,
    "create table if not exists lilmeta (k TEXT PRIMARY KEY, v JSON)"
  );

  const tmpDb = new LilDbSqlite<any>(db, undefined as any);
  let id: string | null = (await tmpDb.getMeta("id")) as string;
  if (!id) {
    id = secureRandomId();
    await tmpDb.setMeta("id", id);
  }

  return {
    id: id,
  };
}

function buildSqlPath(queryPath: string): string {
  if (queryPath === "$id") {
    return `id`;
  } else if (queryPath === "$tx") {
    return `tx`;
  } else if (queryPath === "$rev") {
    return `revision`;
  }

  return (
    `val->>` +
    queryPath
      .split(".")
      .map((part) => {
        // ATTENTION: be careful with this regex. because this goes into the sql query directly it should be as strict as possible
        const matched = part.match(/^[a-zA-Z]+$/ /* ATTENTION */);
        if (matched) {
          return `'${matched}'`;
        } else {
          throw new Error(`query path contains invalid keys`);
        }
      })
      .join(`->>`)
  );
}

const operatorMap = {
  $eq: "=",
  $gt: ">",
  $gte: ">=",
  $lt: "<",
  $lte: "<=",
} as { [k: string]: string };

export class LilDbSqlite<ValueType> extends LilDb<ValueType> {
  public readonly id: string;

  private db: sqlite3.Database;

  constructor(db: sqlite3.Database, id: string) {
    super();
    this.id = id;
    this.db = db;
  }

  setMeta<MetaValue extends JSONValue>(
    id: string,
    v: MetaValue
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `insert into lilmeta (k, v) VALUES (?, json(?)) ON CONFLICT(k) DO UPDATE SET v=excluded.v`,
        [id, JSON.stringify(v)],
        (error) => {
          if (error) {
            reject(error);
          } else {
            resolve(undefined);
          }
        }
      );
    });
  }

  getMeta<MetaValue extends JSONValue>(id: string): Promise<MetaValue | null> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `select v from lilmeta where k = ?`,
        [id],
        (err, rows: any) => {
          if (err) {
            reject(err);
          } else {
            if (rows.length === 0) {
              return resolve(null);
            } else {
              resolve(JSON.parse(rows[0].v));
            }
          }
        }
      );
    });
  }

  private _put(
    id: string,
    value: ValueType,
    tombstone: number,
    assertRevision: number | undefined
  ): Promise<void> {
    const assertFreshKey = assertRevision === 0;
    const assertSpecificRevision =
      !assertFreshKey && assertRevision !== undefined;

    return new Promise((resolve, reject) => {
      this.db.run(
        [
          `INSERT INTO docs (id, val, tx, revision, tombstone)`,
          `VALUES (?, json(?), (select coalesce(max(tx),0) from docs)+1, 1, ?)`,
          [
            // skip conflict resolution when the user asserted a fresh document
            assertFreshKey
              ? ""
              : `ON CONFLICT(id) DO UPDATE SET tx=excluded.tx, val=excluded.val, revision=revision+1, tombstone=excluded.tombstone`,
          ],
          assertSpecificRevision ? `WHERE excluded.revision = ?` : "",
        ].join(" "),
        [
          id,
          JSON.stringify(value),
          tombstone,
          ...(assertSpecificRevision ? [assertRevision] : []),
        ],
        function (error) {
          if (error) {
            reject(error);
          } else {
            if (this.changes === 0) {
              reject(new Error(`expected to change document but couldnt`));
            } else {
              resolve(undefined);
            }
          }
        }
      );
    });
  }

  put(id: string, value: ValueType, assertRevision?: number): Promise<void> {
    return this._put(id, value, 0, assertRevision);
  }

  delete(id: string): Promise<void> {
    return this._put(id, {} as any, 1, undefined); // TODO: think about it: does it make sense to be able to assert deletions?
  }

  query(q: Query): Promise<QueryResult<ValueType>> {
    return new Promise<QueryResult<ValueType>>(async (resolve, reject) => {
      let stmt = `select id, val, tx, revision, tombstone from docs`;
      let params: any[] = [];

      // selectors
      const whereClauses = Object.entries(q.selector).flatMap(
        ([path, assertion]) => {
          const key = buildSqlPath(path);
          if (stringq(assertion)) {
            return [[`${key} = ?`, "" + assertion]];
          } else {
            return Object.entries(assertion).map(([operator, value]) => {
              const sqlOp = operatorMap[operator];
              if (sqlOp) {
                return [`${key} ${sqlOp} ?`, value];
              } else if (operator === "$starts") {
                // TODO: for now we just rigorously restrict the types of values you can query for ...
                // in theory we should do some better escaping here later and allow more values
                // see: https://stackoverflow.com/questions/8247970/using-like-wildcard-in-prepared-statement
                value = value.toString();
                if (value.match(/^[a-zA-Z0-9]+$/)) {
                  return [`${key} LIKE ?`, `${value}%`];
                } else {
                  throw new Error("unsupported value for startsWith query");
                }
              } else {
                throw new Error(`invalid comparator in query`);
              }
            });
          }
        }
      );
      if (!q.includeTombstoned) {
        whereClauses.push(["tombstone = ?", 0]);
      }
      if (whereClauses.length > 0) {
        stmt += ` WHERE ${whereClauses
          .map((clause) => clause[0])
          .join(` AND `)}`;
        whereClauses.forEach(([_, value]) => {
          if (stringq(value) || typeof value === "number") {
            params.push(value);
          } else {
            throw new Error(`queried value neither string or number`);
          }
        });
      }

      // sorting
      const sortBy = (q.sort || ["$id"]).map(buildSqlPath);
      stmt += ` ORDER BY ${sortBy.join(", ")} ${q.reverse ? `DESC` : `ASC`}`;

      // paging
      const limit = Math.max(q.limit || DEFAULT_PAGINATION_LIMIT, 1);
      const page = Math.max(q.page || 0, 0);
      stmt += ` LIMIT ${limit} OFFSET ${page * limit}`;

      if (false) {
        this.db.all(`EXPLAIN QUERY PLAN ${stmt}`, [], (error, res) => {
          if (error) {
            reject(error);
          } else {
            console.log(`QUERY-PLAN: `, res);
          }
        });
      }

      if (false) {
        console.log(`STMT: ${stmt}`);
        console.log(`PARAMS: ${params}`);
      }

      // order by

      this.db.all(stmt, params, (error, rows) => {
        if (error) {
          reject(error);
        } else {
          const docs: Doc<ValueType>[] = (rows as any[]).map((row) => {
            return {
              id: row.id,
              revision: row.revision,
              tx: row.tx,
              value: JSON.parse(row.val),
              isTombstoned: row.tombstone !== 0,
            };
          });
          resolve({
            values: docs,
            page: -1,
          });
        }
      });
    });
  }
  currentTx(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      this.db.get(`select coalesce(max(tx),0) as tx from docs`, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve((row as any).tx);
        }
      });
    });
  }

  hintIndex(name: string, selectors: string[]): Promise<void> {
    const checkedName = name.match(/^[a-zA-Z_]+$/);
    if (!checkedName) {
      return Promise.reject("invalid index name");
    }
    return new Promise((resolve, reject) => {
      this.db.run(
        `create index if not exists ${checkedName} on docs (${selectors
          .map(buildSqlPath)
          .join(", ")})`,
        [],
        (error) => {
          if (error) {
            reject(error);
          } else {
            resolve(undefined);
          }
        }
      );
    });
  }
}

export class LilDbStorageManagerSqliteInMemory implements LilDbStorageManager {
  private opened: Map<string, LilDbSqlite<any>> = new Map();

  async open<ValueType extends JSONValue>(
    name: string
  ): Promise<LilDb<ValueType>> {
    if (this.opened.has(name)) {
      throw new Error(`${name} already open`);
    } else {
      const db = new sqlite3.Database(":memory:");
      const { id } = await loadDb(db);
      const newDb = new LilDbSqlite<ValueType>(db, id);
      this.opened.set(name, newDb);
      return newDb;
    }
  }
}

export class LilDbStorageManagerSqliteDirectory implements LilDbStorageManager {
  private dir: string;
  constructor(dir: string) {
    this.dir = dir;
    fs.mkdirSync(this.dir, { recursive: true });
  }

  async open<ValueType extends JSONValue>(
    name: string
  ): Promise<LilDb<ValueType>> {
    if (name.match(/^[a-zA-Z0-9\-]+$/)) {
      const dbFile = `${this.dir}/${name}.db`;
      console.log("trying to open: ", dbFile);
      const db = new sqlite3.Database(dbFile);
      const { id } = await loadDb(db);
      const newDb = new LilDbSqlite<ValueType>(db, id);
      return newDb;
    } else {
      throw new Error(`invalid database name`);
    }
  }
}
