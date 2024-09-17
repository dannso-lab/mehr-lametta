import { JSONValue } from "../data/json";
import { LilDb, Query, QueryResult } from "./common";

// dragons here

export class SubLilDb<ValueType> extends LilDb<ValueType> {
  private baseDb: LilDb<ValueType>;
  private subKey: string;

  constructor(baseDb: LilDb<ValueType>, subKey: string) {
    super();
    this.baseDb = baseDb;
    this.subKey = subKey;
  }

  public get id() {
    return this.baseDb.id;
  }

  setMeta<MetaValue extends JSONValue>(
    id: string,
    v: MetaValue
  ): Promise<void> {
    return this.baseDb.setMeta(id, v);
  }
  getMeta<MetaValue extends JSONValue>(id: string): Promise<MetaValue | null> {
    return this.baseDb.getMeta(id);
  }

  put(id: string, value: ValueType) {
    return this.baseDb.put(`${this.subKey}_${id}`, value);
  }

  delete(id: string) {
    return this.baseDb.delete(`${this.subKey}_${id}`);
  }

  query(q: Query): Promise<QueryResult<ValueType>> {
    // TODO
    return this.baseDb.query(q);
  }

  async currentTx(): Promise<number> {
    return this.baseDb.currentTx();
  }

  hintIndex(name: string, selectors: string[]): Promise<void> {
    return this.baseDb.hintIndex(name, selectors);
  }
}
