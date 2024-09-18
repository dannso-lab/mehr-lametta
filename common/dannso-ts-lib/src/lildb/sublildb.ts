import { JSONValue } from "../data/json";
import { stringq } from "../utils/predicates";
import { LilDb, Query, QueryResult, ValueAssertionCompound } from "./common";

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

  async query(q: Query): Promise<QueryResult<ValueType>> {
    // modify selector to play in our sub key
    const selector = { ...q.selector };
    if (!selector.$id) {
      selector.$id = { $starts: `${this.subKey}_` };
    } else {
      if (stringq(selector.$id)) {
        selector.$id = `${this.subKey}_${selector.$id}`;
      } else {
        // update existing value assertions
        const $id = { ...(selector.$id as ValueAssertionCompound) };
        Object.keys($id).forEach((k) => {
          $id[k as keyof ValueAssertionCompound] = `${this.subKey}_${
            $id[k as keyof ValueAssertionCompound]
          }`;
        });

        // update $id query in selector
        selector.$id = $id;
      }
    }

    const res = await this.baseDb.query({ ...q, selector });

    // remove subkey from result
    res.values = res.values.map((value) => ({
      ...value,
      id: value.id.substring(this.subKey.length + 1),
    }));

    return res;
  }

  async currentTx(): Promise<number> {
    return this.baseDb.currentTx();
  }

  hintIndex(name: string, selectors: string[]): Promise<void> {
    return this.baseDb.hintIndex(name, selectors);
  }
}
