/// <reference lib="dom" />
import type { PetEvent, PetState } from '@daemonling/core';
import {
  computeState,
  makeSnapshot,
  NoPetError,
  parseRecord,
  EVENT_SCHEMA_VERSION,
} from './format.js';
import type { PetStore, Snapshot } from './format.js';

const EVENTS = 'events';
const META = 'meta';
const SNAPSHOT_KEY = 'snapshot';

/** Options for {@link IndexedDbStore}. */
export interface IndexedDbStoreOptions {
  /** Database name. Default `daemonling`. */
  name?: string;
  /** The IndexedDB factory (defaults to `globalThis.indexedDB`; tests pass `fake-indexeddb`). */
  factory?: IDBFactory;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

/**
 * Browser storage with the same interface as the file store: an auto-incrementing `events`
 * object store (the log) and a `meta` store holding the snapshot. Each append is one read-write
 * transaction, so tabs cannot interleave half-written updates.
 */
export class IndexedDbStore implements PetStore {
  private readonly name: string;
  private readonly factory: IDBFactory;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(options: IndexedDbStoreOptions = {}) {
    this.name = options.name ?? 'daemonling';
    const factory = options.factory ?? globalThis.indexedDB;
    if (!factory) throw new Error('IndexedDB is not available in this browser.');
    this.factory = factory;
  }

  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const open = this.factory.open(this.name, 1);
        open.onupgradeneeded = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains(EVENTS)) {
            db.createObjectStore(EVENTS, { autoIncrement: true });
          }
          if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
        };
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
    }
    return this.dbPromise;
  }

  private static parse(raw: unknown[]): PetEvent[] {
    return raw.map(parseRecord).filter((e): e is PetEvent => e !== null);
  }

  async load(): Promise<{ events: PetEvent[]; state: PetState | null }> {
    const db = await this.db();
    const tx = db.transaction([EVENTS, META], 'readonly');
    const [raw, snapshot] = await Promise.all([
      request(tx.objectStore(EVENTS).getAll()),
      request(tx.objectStore(META).get(SNAPSHOT_KEY)) as Promise<Snapshot | undefined>,
    ]);
    const events = IndexedDbStore.parse(raw);
    return { events, state: computeState(events, snapshot ?? null) };
  }

  async append(newEvents: PetEvent[]): Promise<PetState> {
    const db = await this.db();
    const tx = db.transaction([EVENTS, META], 'readwrite');
    const events = tx.objectStore(EVENTS);
    const meta = tx.objectStore(META);
    const [raw, snapshot] = await Promise.all([
      request(events.getAll()),
      request(meta.get(SNAPSHOT_KEY)) as Promise<Snapshot | undefined>,
    ]);
    const all = [...IndexedDbStore.parse(raw), ...newEvents];
    const state = computeState(all, snapshot ?? null);
    if (!state) {
      tx.abort();
      throw new NoPetError();
    }
    for (const event of newEvents) events.add({ v: EVENT_SCHEMA_VERSION, ...event });
    meta.put(makeSnapshot(state, all.length), SNAPSHOT_KEY);
    await done(tx);
    return state;
  }

  async replaceAll(newEvents: PetEvent[]): Promise<PetState> {
    const state = computeState(newEvents, null);
    if (!state) throw new NoPetError();
    const db = await this.db();
    const tx = db.transaction([EVENTS, META], 'readwrite');
    const events = tx.objectStore(EVENTS);
    events.clear();
    for (const event of newEvents) events.add({ v: EVENT_SCHEMA_VERSION, ...event });
    tx.objectStore(META).put(makeSnapshot(state, newEvents.length), SNAPSHOT_KEY);
    await done(tx);
    return state;
  }

  /** Deletes everything (used by "start over" in settings). */
  async clear(): Promise<void> {
    const db = await this.db();
    const tx = db.transaction([EVENTS, META], 'readwrite');
    tx.objectStore(EVENTS).clear();
    tx.objectStore(META).clear();
    await done(tx);
  }

  /** Closes the connection. */
  async close(): Promise<void> {
    if (this.dbPromise) (await this.dbPromise).close();
    this.dbPromise = null;
  }
}
