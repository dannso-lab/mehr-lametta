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
    "create table if not exists lilmeta (k TEXT PRIMARY KEY, v TEXT)"
  );

  let id: string | null = null;

  while (!id) {
    id = await new Promise<string | null>((resolve, reject) => {
      db.get(`select v from lilmeta where k = 'dbid'`, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve((row && (row as any).v) || null);
        }
      });
    });

    if (!id) {
      const newId = secureRandomId();
      await sqlrun(db, "insert into lilmeta VALUES('dbid', ?)", [newId]);
    }
  }

  return {
    id: id!,
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

  private _put(id: string, value: ValueType, tombstone: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `insert into docs (id, val, tx, revision, tombstone) VALUES (?, json(?), (select coalesce(max(tx),0) from docs)+1, 0, ?) ON CONFLICT(id) DO UPDATE SET tx=excluded.tx, val=excluded.val, revision=revision+1, tombstone=excluded.tombstone`,
        [id, JSON.stringify(value), tombstone],
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

  put(id: string, value: ValueType): Promise<void> {
    return this._put(id, value, 0);
  }

  delete(id: string): Promise<void> {
    return this._put(id, {} as any, 1);
  }

  query(q: Query): Promise<QueryResult<ValueType>> {
    return new Promise<QueryResult<ValueType>>(async (resolve, reject) => {
      let stmt = `select id, val, tx, revision, tombstone from docs`;
      let params: any[] = [];

      // selectors
      const whereClauses = Object.entries(q.selector).flatMap(
        ([path, assertion]) => {
          const key = buildSqlPath(path);
          if (typeof assertion === "string") {
            return [[`${key} = ?`, assertion]];
          } else {
            return Object.entries(assertion).map(([operator, value]) => {
              const sqlOp = operatorMap[operator];
              if (sqlOp) {
                return [`${key} ${sqlOp} ?`, value];
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
          if (typeof value === "string" || typeof value === "number") {
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
