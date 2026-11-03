import { describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { IndexedDbStore, NoPetError } from '../src/index.js';
import { EVENTS } from './fixtures.js';

describe('IndexedDbStore', () => {
  it('has the same behaviour as the file store', async () => {
    const factory = new IDBFactory();
    const store = new IndexedDbStore({ factory });
    expect((await store.load()).state).toBeNull();
    await expect(store.append([{ type: 'TICK', at: EVENTS[0]!.at }])).rejects.toThrow(NoPetError);
    const state = await store.append(EVENTS.slice(0, 2));
    expect(state.activeSession).not.toBeNull();
    const after = await store.append(EVENTS.slice(2));
    expect(after.xp).toBe(25);
    await store.close();

    const reopened = new IndexedDbStore({ factory });
    const loaded = await reopened.load();
    expect(loaded.events).toEqual(EVENTS);
    expect(loaded.state).toEqual(after);

    const replaced = await reopened.replaceAll(EVENTS.slice(0, 1));
    expect(replaced.xp).toBe(0);
    expect((await reopened.load()).events).toHaveLength(1);
    await expect(reopened.replaceAll([])).rejects.toThrow(NoPetError);
    await reopened.clear();
    expect((await reopened.load()).state).toBeNull();
  });

  it('requires IndexedDB', () => {
    const original = globalThis.indexedDB;
    // @ts-expect-error simulate a browser without IndexedDB
    delete globalThis.indexedDB;
    expect(() => new IndexedDbStore()).toThrow(/not available/);
    if (original) globalThis.indexedDB = original;
  });
});
