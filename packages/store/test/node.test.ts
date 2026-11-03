import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileStore, defaultHome } from '../src/node.js';
import { NoPetError } from '../src/index.js';
import { EVENTS } from './fixtures.js';

let home: string;
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'dmn-store-'));
});
afterEach(() => rmSync(home, { recursive: true, force: true }));

describe('FileStore', () => {
  it('resolves its home from DAEMONLING_HOME', () => {
    expect(defaultHome({ DAEMONLING_HOME: '/tmp/x' })).toBe('/tmp/x');
    expect(defaultHome({})).toMatch(/\.daemonling$/);
  });

  it('appends events, writes a snapshot and loads them back', async () => {
    const store = new FileStore({ home });
    expect(store.exists()).toBe(false);
    expect((await store.load()).state).toBeNull();
    const state = await store.append(EVENTS);
    expect(state.xp).toBe(25);
    expect(store.exists()).toBe(true);
    expect(readFileSync(store.eventsPath, 'utf8').trim().split('\n')).toHaveLength(3);
    expect(store.readSnapshot()?.eventCount).toBe(3);
    const loaded = await store.load();
    expect(loaded.events).toEqual(EVENTS);
    expect(loaded.state).toEqual(state);
    expect(existsSync(store.lockPath)).toBe(false);
  });

  it('refuses to append without a pet', () => {
    expect(() => new FileStore({ home }).appendSync([{ type: 'TICK', at: EVENTS[0]!.at }])).toThrow(
      NoPetError,
    );
  });

  it('recovers from a corrupted snapshot by replaying the log', () => {
    const store = new FileStore({ home });
    const state = store.appendSync(EVENTS);
    writeFileSync(store.snapshotPath, '{ not json');
    expect(store.readSnapshot()).toBeNull();
    expect(store.loadSync().state).toEqual(state);
    expect(store.rebuildSnapshot()).toEqual(state);
    expect(store.readSnapshot()?.eventCount).toBe(3);
  });

  it('catches up when another writer appended without updating the snapshot', () => {
    const a = new FileStore({ home });
    a.appendSync(EVENTS.slice(0, 2));
    writeFileSync(
      a.eventsPath,
      readFileSync(a.eventsPath, 'utf8') + JSON.stringify({ v: 2, ...EVENTS[2] }) + '\n',
    );
    expect(new FileStore({ home }).loadSync().state?.xp).toBe(25);
  });

  it('replaces the log on import and keeps a backup', async () => {
    const store = new FileStore({ home });
    store.appendSync(EVENTS);
    const state = await store.replaceAll(EVENTS.slice(0, 1));
    expect(state.xp).toBe(0);
    expect(readdirSync(home).some((f) => f.startsWith('events.jsonl.bak-'))).toBe(true);
    expect(() => store.replaceAllSync([])).toThrow(NoPetError);
  });

  it('waits for, then times out on, a held lock — and steals a stale one', () => {
    const store = new FileStore({ home, lockTimeoutMs: 50, staleLockMs: 60_000 });
    writeFileSync(store.lockPath, 'other');
    expect(() => store.appendSync(EVENTS)).toThrow(/busy/);
    const old = (Date.now() - 120_000) / 1000;
    utimesSync(store.lockPath, old, old);
    expect(store.appendSync(EVENTS).xp).toBe(25);
  });

  it('serialises concurrent writers', async () => {
    const a = new FileStore({ home });
    const b = new FileStore({ home });
    a.appendSync(EVENTS.slice(0, 1));
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        (i % 2 ? a : b).append([{ type: 'PET_PETTED', at: EVENTS[0]!.at }]),
      ),
    );
    expect(a.loadSync().events).toHaveLength(21);
    expect(a.readSnapshot()?.eventCount).toBe(21);
  });
});
