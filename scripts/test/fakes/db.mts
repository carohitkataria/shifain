/* eslint-disable @typescript-eslint/no-explicit-any -- documents of any shape, walked by dotted path, as MongoDB does */
/**
 * An in-memory stand-in for src/lib/db.ts, for the assistant scenarios: the
 * same exports, backed by plain arrays, supporting the subset of MongoDB
 * queries and updates the app uses. Never connects anywhere, so a scenario
 * can neither read nor change real data.
 *
 * Loaded in place of db.ts by scripts/test/scenario-hooks.mjs.
 */

type Doc = Record<string, any>;

const store = new Map<string, Doc[]>();

export const DB_NAME = "scenario";

/** Empties every collection; the runner calls it between scenarios. */
export function resetFakeDb(seed: Record<string, Doc[]> = {}): void {
  store.clear();
  for (const [name, docs] of Object.entries(seed)) store.set(name, docs.map(clone));
}

export function fakeCollection(name: string): Doc[] {
  if (!store.has(name)) store.set(name, []);
  return store.get(name)!;
}

const clone = <T>(value: T): T => (value === undefined ? value : structuredClone(value));

// ---------------------------------------------------------------- paths

function getPath(doc: Doc, path: string): unknown[] {
  // Every value at a dotted path, walking into arrays as MongoDB does.
  let values: unknown[] = [doc];
  for (const part of path.split(".")) {
    const next: unknown[] = [];
    for (const value of values) {
      if (Array.isArray(value)) {
        if (/^\d+$/.test(part)) next.push(value[Number(part)]);
        else for (const item of value) if (item && typeof item === "object") next.push((item as Doc)[part]);
      } else if (value && typeof value === "object") next.push((value as Doc)[part]);
    }
    values = next;
  }
  return values;
}

function setPath(doc: Doc, path: string, value: unknown): void {
  const parts = path.split(".");
  let target: Doc = doc;
  for (const part of parts.slice(0, -1)) {
    if (target[part] == null || typeof target[part] !== "object") target[part] = {};
    target = target[part];
  }
  target[parts[parts.length - 1]] = value;
}

function unsetPath(doc: Doc, path: string): void {
  const parts = path.split(".");
  let target: Doc | undefined = doc;
  for (const part of parts.slice(0, -1)) target = target?.[part];
  if (target) delete target[parts[parts.length - 1]];
}

// ---------------------------------------------------------------- matching

const isOperatorObject = (value: unknown) =>
  value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof RegExp) && !(value instanceof Date) && Object.keys(value).some((key) => key.startsWith("$"));

function equal(a: unknown, b: unknown): boolean {
  if (a instanceof Date || b instanceof Date) return new Date(a as never).getTime() === new Date(b as never).getTime();
  if (a !== null && b !== null && typeof a === "object" && typeof b === "object") return JSON.stringify(a) === JSON.stringify(b);
  return a === b;
}

/** One value against a condition, with MongoDB's "an array matches if any element does". */
function matchValue(value: unknown, condition: unknown): boolean {
  if (condition instanceof RegExp) return typeof value === "string" ? condition.test(value) : Array.isArray(value) && value.some((item) => matchValue(item, condition));
  if (isOperatorObject(condition)) return Object.entries(condition as Doc).every(([op, arg]) => matchOperator(value, op, arg, condition as Doc));
  if (Array.isArray(value) && !Array.isArray(condition)) return value.some((item) => equal(item, condition));
  if (condition === null) return value === null || value === undefined;
  return equal(value, condition);
}

const compare = (value: unknown, arg: unknown, test: (diff: number) => boolean) => {
  const items = Array.isArray(value) ? value : [value];
  return items.some((item) => {
    if (item === undefined || item === null) return false;
    const a = item instanceof Date ? item.getTime() : item;
    const b = arg instanceof Date ? arg.getTime() : arg;
    if (typeof a === "number" && typeof b === "number") return test(a - b);
    if (typeof a === "string" && typeof b === "string") return test(a < b ? -1 : a > b ? 1 : 0);
    return false;
  });
};

function matchOperator(value: unknown, op: string, arg: any, all: Doc): boolean {
  switch (op) {
    case "$eq": return matchValue(value, arg);
    case "$ne": return !matchValue(value, arg);
    case "$in": return (arg as unknown[]).some((item) => matchValue(value, item));
    case "$nin": return !(arg as unknown[]).some((item) => matchValue(value, item));
    case "$gt": return compare(value, arg, (d) => d > 0);
    case "$gte": return compare(value, arg, (d) => d >= 0);
    case "$lt": return compare(value, arg, (d) => d < 0);
    case "$lte": return compare(value, arg, (d) => d <= 0);
    case "$exists": return (value !== undefined) === Boolean(arg);
    case "$regex": return typeof value === "string" && new RegExp(arg, all.$options ?? "").test(value);
    case "$options": return true;
    case "$not": return !matchValue(value, arg);
    case "$all": return Array.isArray(value) && (arg as unknown[]).every((item) => value.some((v) => equal(v, item)));
    case "$size": return Array.isArray(value) && value.length === arg;
    case "$elemMatch": return Array.isArray(value) && value.some((item) => (item && typeof item === "object" && !isOperatorObject(arg) ? matches(item, arg) : matchValue(item, arg)));
    default: throw new Error(`fake db: unsupported operator ${op}`);
  }
}

export function matches(doc: Doc, filter: Doc = {}): boolean {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === "$or") return (condition as Doc[]).some((sub) => matches(doc, sub));
    if (key === "$and") return (condition as Doc[]).every((sub) => matches(doc, sub));
    if (key === "$nor") return !(condition as Doc[]).some((sub) => matches(doc, sub));
    const values = getPath(doc, key);
    if (values.length === 0) values.push(undefined);
    // Negative conditions hold only if no value at the path breaks them.
    if (isOperatorObject(condition) && ("$ne" in condition || "$nin" in condition || "$not" in condition)) {
      return values.every((value) => matchValue(value, condition));
    }
    return values.some((value) => matchValue(value, condition));
  });
}

// ---------------------------------------------------------------- updates

function applyUpdate(doc: Doc, update: Doc, inserting: boolean): void {
  if (!Object.keys(update).some((key) => key.startsWith("$"))) {
    const id = doc._id;
    for (const key of Object.keys(doc)) delete doc[key];
    Object.assign(doc, clone(update), { _id: id });
    return;
  }
  for (const [op, fields] of Object.entries(update)) {
    for (const [path, arg] of Object.entries(fields as Doc)) {
      const current = getPath(doc, path)[0];
      switch (op) {
        case "$set": setPath(doc, path, clone(arg)); break;
        case "$setOnInsert": if (inserting) setPath(doc, path, clone(arg)); break;
        case "$unset": unsetPath(doc, path); break;
        case "$inc": setPath(doc, path, (typeof current === "number" ? current : 0) + (arg as number)); break;
        case "$min": if (current === undefined || (arg as never) < (current as never)) setPath(doc, path, arg); break;
        case "$max": if (current === undefined || (arg as never) > (current as never)) setPath(doc, path, arg); break;
        case "$push":
        case "$addToSet": {
          const list = Array.isArray(current) ? [...current] : [];
          const items = arg && typeof arg === "object" && "$each" in arg ? (arg.$each as unknown[]) : [arg];
          for (const item of items) if (op === "$push" || !list.some((existing) => equal(existing, item))) list.push(clone(item));
          const slice = arg && typeof arg === "object" ? (arg as Doc).$slice : undefined;
          setPath(doc, path, typeof slice === "number" ? (slice < 0 ? list.slice(slice) : list.slice(0, slice)) : list);
          break;
        }
        case "$pull": {
          if (Array.isArray(current)) {
            setPath(doc, path, current.filter((item) => (arg && typeof arg === "object" && !isOperatorObject(arg) && item && typeof item === "object" ? !matches(item, arg) : !matchValue(item, arg))));
          }
          break;
        }
        default: throw new Error(`fake db: unsupported update ${op}`);
      }
    }
  }
}

function seedFromFilter(filter: Doc): Doc {
  const doc: Doc = {};
  for (const [key, value] of Object.entries(filter)) {
    if (key.startsWith("$") || isOperatorObject(value) || value instanceof RegExp) continue;
    setPath(doc, key, clone(value));
  }
  return doc;
}

let counter = 0;
const newId = () => `fake${Date.now().toString(36)}${(counter++).toString(36)}`;

function duplicate(name: string, id: unknown): Error {
  return Object.assign(new Error(`E11000 duplicate key error collection: ${name} index: _id_ dup key: { _id: ${JSON.stringify(id)} }`), { code: 11000 });
}

// ---------------------------------------------------------------- cursors and collections

function sortDocs(docs: Doc[], spec: Doc): Doc[] {
  const keys = Object.entries(spec);
  return [...docs].sort((a, b) => {
    for (const [key, direction] of keys) {
      const x = getPath(a, key)[0] as never;
      const y = getPath(b, key)[0] as never;
      if (x === y) continue;
      if (x === undefined) return -1 * (direction as number);
      if (y === undefined) return 1 * (direction as number);
      return (x < y ? -1 : 1) * (direction as number);
    }
    return 0;
  });
}

function project(doc: Doc, projection?: Doc): Doc {
  if (!projection || Object.keys(projection).length === 0) return clone(doc);
  const include = Object.entries(projection).filter(([, v]) => v);
  if (include.length > 0 && !(include.length === 1 && include[0][0] === "_id")) {
    const out: Doc = {};
    for (const [key] of include) {
      const value = getPath(doc, key)[0];
      if (value !== undefined) setPath(out, key, clone(value));
    }
    if (projection._id !== 0) out._id = doc._id;
    return out;
  }
  const out = clone(doc);
  for (const [key, v] of Object.entries(projection)) if (!v) unsetPath(out, key);
  return out;
}

class Cursor {
  private sortSpec: Doc | null = null;
  private skipCount = 0;
  private limitCount = 0;
  private readonly docs: () => Doc[];
  private projection?: Doc;
  constructor(docs: () => Doc[], projection?: Doc) {
    this.docs = docs;
    this.projection = projection;
  }
  sort(spec: Doc) { this.sortSpec = spec; return this; }
  skip(n: number) { this.skipCount = n; return this; }
  limit(n: number) { this.limitCount = n; return this; }
  project(spec: Doc) { this.projection = spec; return this; }
  async toArray() {
    let list = this.docs();
    if (this.sortSpec) list = sortDocs(list, this.sortSpec);
    list = list.slice(this.skipCount, this.limitCount ? this.skipCount + this.limitCount : undefined);
    return list.map((doc) => project(doc, this.projection));
  }
  async *[Symbol.asyncIterator]() { for (const doc of await this.toArray()) yield doc; }
}

function collection(name: string) {
  const docs = () => fakeCollection(name);
  const find = (filter: Doc = {}) => docs().filter((doc) => matches(doc, filter));
  const insert = (doc: Doc) => {
    const copy = clone(doc);
    copy._id ??= newId();
    if (docs().some((existing) => equal(existing._id, copy._id))) throw duplicate(name, copy._id);
    docs().push(copy);
    doc._id ??= copy._id;
    return copy._id;
  };
  const update = (filter: Doc, change: Doc, options: { upsert?: boolean } = {}, many = false) => {
    const found = find(filter);
    const targets = many ? found : found.slice(0, 1);
    for (const doc of targets) applyUpdate(doc, change, false);
    if (targets.length === 0 && options.upsert) {
      const doc = seedFromFilter(filter);
      applyUpdate(doc, change, true);
      const id = insert(doc);
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1, upsertedId: id };
    }
    return { acknowledged: true, matchedCount: targets.length, modifiedCount: targets.length, upsertedCount: 0, upsertedId: null };
  };
  return {
    collectionName: name,
    find: (filter?: Doc, options?: { projection?: Doc }) => new Cursor(() => find(filter), options?.projection),
    findOne: async (filter?: Doc, options?: { projection?: Doc; sort?: Doc }) => {
      let list = find(filter);
      if (options?.sort) list = sortDocs(list, options.sort);
      return list[0] ? project(list[0], options?.projection) : null;
    },
    insertOne: async (doc: Doc) => ({ acknowledged: true, insertedId: insert(doc) }),
    insertMany: async (list: Doc[]) => ({ acknowledged: true, insertedCount: list.map(insert).length }),
    updateOne: async (filter: Doc, change: Doc, options?: { upsert?: boolean }) => update(filter, change, options),
    updateMany: async (filter: Doc, change: Doc, options?: { upsert?: boolean }) => update(filter, change, options, true),
    replaceOne: async (filter: Doc, replacement: Doc, options?: { upsert?: boolean }) => update(filter, replacement, options),
    findOneAndUpdate: async (filter: Doc, change: Doc, options: { upsert?: boolean; returnDocument?: "before" | "after" } = {}) => {
      const before = find(filter)[0];
      const snapshot = before ? clone(before) : null;
      const result = update(filter, change, options);
      const after = before ?? (result.upsertedId ? find({ _id: result.upsertedId })[0] : null);
      return options.returnDocument === "after" ? (after ? clone(after) : null) : snapshot;
    },
    deleteOne: async (filter: Doc) => {
      const index = docs().findIndex((doc) => matches(doc, filter));
      if (index >= 0) docs().splice(index, 1);
      return { acknowledged: true, deletedCount: index >= 0 ? 1 : 0 };
    },
    deleteMany: async (filter: Doc = {}) => {
      const keep = docs().filter((doc) => !matches(doc, filter));
      const deleted = docs().length - keep.length;
      store.set(name, keep);
      return { acknowledged: true, deletedCount: deleted };
    },
    countDocuments: async (filter?: Doc) => find(filter).length,
    distinct: async (key: string, filter?: Doc) => [...new Set(find(filter).flatMap((doc) => getPath(doc, key)))],
    createIndex: async () => "fake-index",
    // Aggregations are only used by console reports; scenarios get an empty result.
    aggregate: () => new Cursor(() => []),
  };
}

const db = { databaseName: DB_NAME, collection, listCollections: () => ({ toArray: async () => [...store.keys()].map((name) => ({ name })) }) };

export function isDatabaseConfigured(): boolean {
  return true;
}

export async function getDb(): Promise<any> {
  return db;
}

export async function readOr<T>(fallback: T, read: (db: any) => Promise<T>): Promise<T> {
  try {
    return await read(db);
  } catch (error) {
    console.error("[fake db] read failed, using fallback:", error);
    return fallback;
  }
}
