import { CONFIG, EVENT_TYPES, reduce, replay } from '@daemonling/core';
import type { PetEvent, PetEventType, PetState } from '@daemonling/core';

/**
 * Version of the on-disk event record. Every stored record carries `v`. Version 1 was the
 * pre-release format (see {@link migrateRecord}); version 2 is current.
 */
export const EVENT_SCHEMA_VERSION = 2;

/** Version of the snapshot file layout. */
export const SNAPSHOT_VERSION = 1;

/** A stored event: the core event plus its record version. */
export type StoredEvent = PetEvent & { v: number };

/** Cached state so readers need not replay the whole log. */
export interface Snapshot {
  snapshotVersion: number;
  /** Must match the engine's `CONFIG.stateSchemaVersion`, otherwise the log is replayed. */
  stateSchemaVersion: number;
  /** Number of events the state was computed from. */
  eventCount: number;
  state: PetState;
}

/** JSON document produced by `dmn export` and the web app's export button. */
export interface ExportFile {
  format: 'daemonling-export';
  version: number;
  exportedAt: string;
  events: PetEvent[];
}

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const V1_TYPE_RENAMES: Record<string, PetEventType> = {
  HATCH: 'PET_CREATED',
  SESSION_BEGIN: 'SESSION_STARTED',
  SESSION_DONE: 'SESSION_COMPLETED',
  SESSION_QUIT: 'SESSION_ABANDONED',
};

/**
 * Upgrades one raw record to the current version. Example migration v1 → v2: the pre-release
 * format used `kind`/`ts` instead of `type`/`at`, older event names (`SESSION_DONE`, …) and `mins`
 * instead of `minutes`. Records without `v` are treated as v1.
 */
export function migrateRecord(raw: unknown): Json | null {
  if (!isObject(raw)) return null;
  let record: Json = { ...raw };
  let version = typeof record.v === 'number' ? record.v : 1;
  if (version === 1) {
    const { kind, ts, mins, ...rest } = record;
    const typeName = typeof rest.type === 'string' ? rest.type : kind;
    record = {
      ...rest,
      type: typeof typeName === 'string' ? (V1_TYPE_RENAMES[typeName] ?? typeName) : typeName,
      at: rest.at ?? ts,
    };
    if (mins !== undefined && record.minutes === undefined) record.minutes = mins;
    version = 2;
  }
  if (version !== EVENT_SCHEMA_VERSION) return null;
  record.v = version;
  return record;
}

/** Checks that a migrated record is a well-formed event. Unknown extra fields are kept. */
export function validateEvent(record: Json): PetEvent | null {
  if (typeof record.type !== 'string' || !EVENT_TYPES.includes(record.type as PetEventType)) {
    return null;
  }
  if (typeof record.at !== 'string' || Number.isNaN(Date.parse(record.at))) return null;
  const num = (key: string): boolean => typeof record[key] === 'number';
  switch (record.type as PetEventType) {
    case 'PET_CREATED':
      if (typeof record.id !== 'string' || typeof record.name !== 'string') return null;
      break;
    case 'SESSION_STARTED':
      if (!num('plannedMinutes')) return null;
      break;
    case 'SESSION_COMPLETED':
    case 'BREAK_TAKEN':
      if (!num('minutes')) return null;
      break;
    case 'SESSION_ABANDONED':
    case 'DISTRACTION_REPORTED':
      if (!num('minutesDone')) return null;
      break;
    case 'DISTRACTION_DETECTED':
      if (!num('secondsAway')) return null;
      break;
    case 'VACATION_SET':
      if (typeof record.on !== 'boolean') return null;
      break;
    case 'SETTINGS_CHANGED':
      if (!isObject(record.settings)) return null;
      break;
    default:
      break;
  }
  const { v: _v, ...event } = record;
  return event as unknown as PetEvent;
}

/** Migrates and validates one raw record; returns null if it cannot be used. */
export function parseRecord(raw: unknown): PetEvent | null {
  const migrated = migrateRecord(raw);
  return migrated ? validateEvent(migrated) : null;
}

/** Serialises an event as one JSONL line (with trailing newline). */
export function toLine(event: PetEvent): string {
  return `${JSON.stringify({ v: EVENT_SCHEMA_VERSION, ...event })}\n`;
}

/** Result of parsing a JSONL log. */
export interface ParsedLog {
  events: PetEvent[];
  /** Lines that could not be parsed or validated (for example a torn final write). */
  skipped: number;
}

/** Parses JSONL text into events, skipping unreadable lines. */
export function parseLog(text: string): ParsedLog {
  const events: PetEvent[] = [];
  let skipped = 0;
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    try {
      const event = parseRecord(JSON.parse(line));
      if (event) events.push(event);
      else skipped += 1;
    } catch {
      skipped += 1;
    }
  }
  return { events, skipped };
}

/**
 * Computes the current state from the log, reusing a snapshot when it is compatible (same engine
 * schema and not ahead of the log). Returns null when the log has no pet.
 */
export function computeState(
  events: readonly PetEvent[],
  snapshot: Snapshot | null,
): PetState | null {
  if (events.length === 0 || events[0]?.type !== 'PET_CREATED') return null;
  if (
    snapshot &&
    snapshot.snapshotVersion === SNAPSHOT_VERSION &&
    snapshot.stateSchemaVersion === CONFIG.stateSchemaVersion &&
    snapshot.eventCount <= events.length &&
    snapshot.eventCount > 0 &&
    snapshot.state?.id === (events[0] as { id: string }).id
  ) {
    return events.slice(snapshot.eventCount).reduce(reduce, snapshot.state);
  }
  return replay(events);
}

/** Builds a snapshot object. */
export function makeSnapshot(state: PetState, eventCount: number): Snapshot {
  return {
    snapshotVersion: SNAPSHOT_VERSION,
    stateSchemaVersion: CONFIG.stateSchemaVersion,
    eventCount,
    state,
  };
}

/** Builds an export document. `exportedAt` is passed in to keep this pure. */
export function makeExport(events: readonly PetEvent[], exportedAt: string): ExportFile {
  return {
    format: 'daemonling-export',
    version: EVENT_SCHEMA_VERSION,
    exportedAt,
    events: [...events],
  };
}

/** Error thrown for unusable import files. */
export class ImportError extends Error {
  override name = 'ImportError';
}

/**
 * Parses an export document (or a bare array of events), migrating old records. Throws
 * {@link ImportError} with a friendly message when the file is unusable.
 */
export function parseExport(text: string): PetEvent[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError('That file is not valid JSON.');
  }
  const raw = Array.isArray(data) ? data : isObject(data) ? data.events : undefined;
  if (!Array.isArray(raw)) {
    throw new ImportError('That file does not look like a Daemonling export (no "events" list).');
  }
  const events = raw.map(parseRecord);
  const bad = events.findIndex((e) => e === null);
  if (bad !== -1) throw new ImportError(`Event #${bad + 1} in that file is not valid.`);
  const valid = events as PetEvent[];
  if (valid[0]?.type !== 'PET_CREATED') {
    throw new ImportError('An export must start with the PET_CREATED event.');
  }
  return valid;
}

/** The interface every storage adapter implements (Node files, browser IndexedDB). */
export interface PetStore {
  /** Reads the log and returns the events and current state (null when there is no pet yet). */
  load(): Promise<{ events: PetEvent[]; state: PetState | null }>;
  /** Appends events atomically and returns the new state. */
  append(events: PetEvent[]): Promise<PetState>;
  /** Replaces the whole log (import). The previous log is kept as a backup where possible. */
  replaceAll(events: PetEvent[]): Promise<PetState>;
}

/** Error thrown when appending to an empty store without `PET_CREATED` first. */
export class NoPetError extends Error {
  override name = 'NoPetError';
  constructor() {
    super('No pet yet. Run `dmn init` to hatch one.');
  }
}
