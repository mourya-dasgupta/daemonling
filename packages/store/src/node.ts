import {
  appendFileSync,
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { PetEvent, PetState } from '@daemonling/core';
import { computeState, makeSnapshot, NoPetError, parseLog, toLine } from './format.js';
import type { PetStore, Snapshot } from './format.js';

/** Where the CLI and VS Code extension keep the pet: `$DAEMONLING_HOME` or `~/.daemonling`. */
export function defaultHome(env: NodeJS.ProcessEnv = process.env): string {
  return env.DAEMONLING_HOME && env.DAEMONLING_HOME.length > 0
    ? env.DAEMONLING_HOME
    : join(homedir(), '.daemonling');
}

/** Options for {@link FileStore}. */
export interface FileStoreOptions {
  /** Directory holding `events.jsonl`, `snapshot.json` and the lock file. */
  home?: string;
  /** How long to wait for the lock before giving up (ms). Default 5000. */
  lockTimeoutMs?: number;
  /** A lock older than this is considered abandoned by a crashed process (ms). Default 10000. */
  staleLockMs?: number;
}

const sleepBuffer = new Int32Array(new SharedArrayBuffer(4));
function sleepSync(ms: number): void {
  Atomics.wait(sleepBuffer, 0, 0, ms);
}

/**
 * Append-only JSONL event log plus a cached snapshot, safe to share between the CLI and the VS
 * Code extension: writers take an exclusive lock file, appends are single `write` calls, and the
 * snapshot is replaced atomically (write to a temp file, then rename).
 */
export class FileStore implements PetStore {
  readonly home: string;
  readonly eventsPath: string;
  readonly snapshotPath: string;
  readonly lockPath: string;
  private readonly lockTimeoutMs: number;
  private readonly staleLockMs: number;

  constructor(options: FileStoreOptions = {}) {
    this.home = options.home ?? defaultHome();
    this.eventsPath = join(this.home, 'events.jsonl');
    this.snapshotPath = join(this.home, 'snapshot.json');
    this.lockPath = join(this.home, 'events.lock');
    this.lockTimeoutMs = options.lockTimeoutMs ?? 5000;
    this.staleLockMs = options.staleLockMs ?? 10_000;
  }

  /** True when a pet has been created in this home. */
  exists(): boolean {
    return existsSync(this.eventsPath);
  }

  /** Reads the cached snapshot only (fast path for `dmn prompt`); null if missing or unreadable. */
  readSnapshot(): Snapshot | null {
    try {
      const data = JSON.parse(readFileSync(this.snapshotPath, 'utf8')) as Snapshot;
      return data && typeof data === 'object' && data.state ? data : null;
    } catch {
      return null;
    }
  }

  /** Reads and parses the event log. */
  readEvents(): { events: PetEvent[]; skipped: number } {
    if (!existsSync(this.eventsPath)) return { events: [], skipped: 0 };
    return parseLog(readFileSync(this.eventsPath, 'utf8'));
  }

  /** Synchronous load: events plus current state (replaying past the snapshot as needed). */
  loadSync(): { events: PetEvent[]; state: PetState | null; skipped: number } {
    const { events, skipped } = this.readEvents();
    return { events, state: computeState(events, this.readSnapshot()), skipped };
  }

  async load(): Promise<{ events: PetEvent[]; state: PetState | null }> {
    const { events, state } = this.loadSync();
    return { events, state };
  }

  /** Synchronous append under the lock. Throws {@link NoPetError} if there is no pet yet. */
  appendSync(newEvents: PetEvent[]): PetState {
    return this.withLock(() => {
      const { events } = this.readEvents();
      const all = [...events, ...newEvents];
      const state = computeState(all, this.readSnapshot());
      if (!state) throw new NoPetError();
      mkdirSync(this.home, { recursive: true });
      appendFileSync(this.eventsPath, newEvents.map(toLine).join(''), { mode: 0o600 });
      this.writeSnapshot(makeSnapshot(state, all.length));
      return state;
    });
  }

  async append(events: PetEvent[]): Promise<PetState> {
    return this.appendSync(events);
  }

  /** Replaces the log (import), keeping the old one as `events.jsonl.bak-<timestamp>`. */
  replaceAllSync(events: PetEvent[], backupSuffix = String(Date.now())): PetState {
    return this.withLock(() => {
      const state = computeState(events, null);
      if (!state) throw new NoPetError();
      mkdirSync(this.home, { recursive: true });
      if (existsSync(this.eventsPath)) {
        copyFileSync(this.eventsPath, `${this.eventsPath}.bak-${backupSuffix}`);
      }
      this.writeAtomic(this.eventsPath, events.map(toLine).join(''));
      this.writeSnapshot(makeSnapshot(state, events.length));
      return state;
    });
  }

  async replaceAll(events: PetEvent[]): Promise<PetState> {
    return this.replaceAllSync(events);
  }

  /** Rebuilds `snapshot.json` from the log (recovery after corruption). */
  rebuildSnapshot(): PetState | null {
    return this.withLock(() => {
      const { events } = this.readEvents();
      const state = computeState(events, null);
      if (state) this.writeSnapshot(makeSnapshot(state, events.length));
      return state;
    });
  }

  private writeSnapshot(snapshot: Snapshot): void {
    this.writeAtomic(this.snapshotPath, `${JSON.stringify(snapshot)}\n`);
  }

  private writeAtomic(path: string, content: string): void {
    const tmp = `${path}.${process.pid}.tmp`;
    writeFileSync(tmp, content, { mode: 0o600 });
    renameSync(tmp, path);
  }

  /** Runs `fn` while holding the exclusive lock file. */
  withLock<T>(fn: () => T): T {
    mkdirSync(this.home, { recursive: true, mode: 0o700 });
    const deadline = Date.now() + this.lockTimeoutMs;
    let fd: number | null = null;
    while (fd === null) {
      try {
        fd = openSync(this.lockPath, 'wx', 0o600);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        if (this.lockIsStale()) {
          rmSync(this.lockPath, { force: true });
          continue;
        }
        if (Date.now() > deadline) {
          throw new Error(
            `Daemonling's data is busy (lock held at ${this.lockPath}). If no other dmn or VS Code is running, delete that file.`,
          );
        }
        sleepSync(15);
      }
    }
    try {
      writeSync(fd, `${process.pid} ${new Date().toISOString()}\n`);
      return fn();
    } finally {
      closeSync(fd);
      rmSync(this.lockPath, { force: true });
    }
  }

  private lockIsStale(): boolean {
    try {
      return Date.now() - statSync(this.lockPath).mtimeMs > this.staleLockMs;
    } catch {
      return true;
    }
  }
}
