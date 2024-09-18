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

export const DEFAULT_PAGINATION_LIMIT = 100;

export interface Doc<ValueType> {
  id: string;
  value: ValueType;
  tx: number; // per db transaction counter of the last write to this document
  revision: number; // number of writes to this document in this database
  isTombstoned: boolean;
}

export type AssertableValue = string | number | undefined;
export type ValueAssertionString = string;
export type ValueAssertionCompound = {
  $eq?: AssertableValue;
  $gt?: AssertableValue;
  $gte?: AssertableValue;
  $lt?: AssertableValue;
  $lte?: AssertableValue;
  $starts?: AssertableValue;
};
export type ValueAssertion = ValueAssertionString | ValueAssertionCompound;

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

  abstract setMeta<MetaValue extends JSONValue>(
    id: string,
    v: MetaValue
  ): Promise<void>;
  abstract getMeta<MetaValue extends JSONValue>(
    id: string
  ): Promise<MetaValue | null>;

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
