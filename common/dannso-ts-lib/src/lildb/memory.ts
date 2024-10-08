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
import { buildAssertionTester, buildPathAccessor } from "./utils";

// this implementation is not efficient. it's more here for convenience of testing and debugging
// idea: implement real indices in here

export class LilDbMemory<ValueType> extends LilDb<ValueType> {
  public readonly id: string;

  private tx: number;
  private store: Map<string, Doc<ValueType>>;

  private meta: Map<string, any>;

  constructor() {
    super();
    this.id = secureRandomId();
    this.tx = 0;
    this.store = new Map();
    this.meta = new Map();
  }

  async setMeta<MetaValue extends JSONValue>(
    id: string,
    v: MetaValue
  ): Promise<void> {
    this.meta.set(id, v);
  }

  async getMeta<MetaValue extends JSONValue>(
    id: string
  ): Promise<MetaValue | null> {
    return this.meta.get(id) || null;
  }

  async put(id: string, value: ValueType, assertRevision?: number) {
    this.tx += 1;
    const tx = this.tx;
    let revision = 0;
    const oldDoc = this.store.get(id);
    if (oldDoc) {
      revision = oldDoc.revision;
    }
    if (assertRevision !== undefined && revision !== assertRevision) {
      throw new Error(`revision doesnt match constraint`);
    }

    if (oldDoc) {
      revision = oldDoc.revision;
    }
    revision += 1;
    this.store.set(id, {
      id,
      tx,
      revision,
      value,
      isTombstoned: false,
    });
  }

  async delete(id: string) {
    const oldDoc = this.store.get(id);
    if (oldDoc) {
      this.tx += 1;
      const tx = this.tx;
      const revision = oldDoc.revision + 1;
      this.store.set(id, {
        id,
        tx,
        revision,
        value: undefined as any,
        isTombstoned: true,
      });
    }
  }

  async query(q: Query): Promise<QueryResult<ValueType>> {
    // prepare query
    const checks: ((doc: Doc<ValueType>) => boolean)[] = [];
    for (let [sel, assertion] of Object.entries(q.selector)) {
      const pick = buildPathAccessor(sel);
      const test = buildAssertionTester(assertion);
      checks.push((doc: Doc<ValueType>) => test(pick(doc)));
    }
    const sortBy = (q.sort || ["$id"]).map(buildPathAccessor);

    const includeTombstoned = q.includeTombstoned || false;

    // filter
    const docs: Doc<ValueType>[] = [];
    this.store.forEach((doc) => {
      let docOk = true;
      for (let check of checks) {
        if (!check(doc) || (doc.isTombstoned && !includeTombstoned)) {
          docOk = false;
          break;
        }
      }
      if (docOk) {
        docs.push(doc);
      }
    });

    // sort
    const smallerOutcome = q.reverse ? 1 : -1;
    docs.sort((a, b) => {
      for (let sortKey of sortBy) {
        const aValue = sortKey(a)!;
        const bValue = sortKey(b)!;
        if (aValue < bValue) {
          return smallerOutcome;
        } else if (aValue > bValue) {
          return smallerOutcome * -1;
        }
      }
      return 0;
    });

    // paginate
    const limit = Math.max(q.limit || DEFAULT_PAGINATION_LIMIT, 1);
    const page = Math.max(q.page || 0, 0);

    const startIndex = limit * page;
    const endIndex = Math.min(limit * (page + 1), docs.length);
    const paginatedDocs: Doc<ValueType>[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      paginatedDocs.push(docs[i]);
    }

    return {
      values: paginatedDocs,
      page: page,
    };
  }

  async currentTx(): Promise<number> {
    return this.tx;
  }

  async hintIndex(name: string, selectors: string[]): Promise<void> {
    // is a no-op here for now
  }
}

export class LilDbStorageManagerMemory implements LilDbStorageManager {
  private opened: Map<string, LilDbMemory<any>> = new Map();

  async open<ValueType extends JSONValue>(
    name: string
  ): Promise<LilDb<ValueType>> {
    if (this.opened.has(name)) {
      throw new Error(`${name} already open`);
    } else {
      const newDb = new LilDbMemory<ValueType>();
      this.opened.set(name, newDb);
      return newDb;
    }
  }
}
