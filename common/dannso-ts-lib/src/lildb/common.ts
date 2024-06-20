/*

Purpose: provide simple but not bare bones document store abstraction
(inspired by the design of couchdb/pouchdb)

- keys = strings, documents = JSON
- creating indices by keys into the JSON, key, or syncable attributes
- syncable protocol by
  - per database instance unique transaction counter
  - every document saves its latest transaction
  - every database has a unique id
  - every database maintains information to which point it is synced with a remote database and it's remote transaction counter
*/

import { JSONValue } from "../data/json";
import { unimpl } from "../utils/unimpl";

export const DEFAULT_PAGINATION_LIMIT = 100;

export interface Doc<ValueType> {
  id: string;
  value: ValueType;
  tx: number; // per db transaction counter of the last write to this document
  revision: number; // number of writes to this document in this database
  isTombstoned: boolean;
}

type AssertableValue = string | number | undefined;
type ValueAssertion =
  | string
  | {
      $eq?: AssertableValue;
      $gt?: AssertableValue;
      $gte?: AssertableValue;
      $lt?: AssertableValue;
      $lte?: AssertableValue;
    };

interface QueryFilter {
  [field: string]: ValueAssertion;
}

export interface Query {
  selector: QueryFilter;
  sort?: string[];
  reverse?: boolean;
  limit?: number;
  page?: number;
  includeTombstoned?: boolean;
}

export interface QueryResult<ValueType> {
  values: Doc<ValueType>[];
  page: number;
}

export abstract class LilDb<ValueType> {
  abstract put(id: string, value: ValueType): Promise<void>;
  abstract query(q: Query): Promise<QueryResult<ValueType>>;
  abstract currentTx(): Promise<number>;
  abstract delete(id: string): Promise<void>;
  abstract id: string;

  abstract hintIndex(name: string, selectors: string[]): Promise<void>;

  async findOne(selector: QueryFilter): Promise<Doc<ValueType> | null> {
    const res = await this.query({
      selector,
      limit: 1,
    });
    if (res.values.length > 0) {
      return res.values[0];
    }
    return null;
  }
}

export interface LilDbStorageManager {
  open<ValueType extends JSONValue>(name: string): Promise<LilDb<ValueType>>;
}

// valid selectors:
// id: $id
// transaction counter: $tx
// key in doc.value: foo
// nested keys: foo.bar
export function buildPathAccessor<ValueType>(
  sel: string
): (doc: Doc<ValueType>) => AssertableValue {
  if (sel === "$id") {
    return ({ id }) => id;
  } else if (sel === "$tx") {
    return ({ tx }) => tx;
  } else if (sel === "$rev") {
    return ({ revision }) => revision;
  }

  let a: (v: any) => AssertableValue = (v: any) => v.value;

  const path = sel.split(".");
  while (path.length > 0) {
    const fnGet = ((pathPart) => {
      return (v: any) => {
        return v ? v[pathPart] : undefined;
      };
    })(path.shift()!);

    if (a) {
      a = ((prevA: any) => {
        return (v: any) => fnGet(prevA(v));
      })(a);
    } else {
      a = fnGet;
    }
  }

  return a;
}

export function buildAssertionTester(
  a: ValueAssertion
): (v: AssertableValue) => boolean {
  if (typeof a === "string") {
    return (v) => v === a;
  } else {
    let fn: (v: AssertableValue) => boolean = () => true;
    for (let [k, checkV] of Object.entries(a)) {
      ((prevFn: (v: AssertableValue) => boolean) => {
        switch (k) {
          case "$eq":
            fn = (v) => prevFn(v) && v === checkV;
            break;
          case "$gt":
            fn = (v) => prevFn(v) && v! > checkV;
            break;
          case "$gte":
            fn = (v) => prevFn(v) && v! >= checkV;
            break;
          case "$lt":
            fn = (v) => prevFn(v) && v! < checkV;
            break;
          case "$lte":
            fn = (v) => prevFn(v) && v! <= checkV;
            break;
          default:
            throw unimpl();
        }
      })(fn);
    }
    return fn;
  }
}
