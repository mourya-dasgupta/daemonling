import { describe, expect, it } from 'vitest';
import { CONFIG, replay } from '@daemonling/core';
import {
  computeState,
  EVENT_SCHEMA_VERSION,
  ImportError,
  makeExport,
  makeSnapshot,
  migrateRecord,
  parseExport,
  parseLog,
  parseRecord,
  toLine,
} from '../src/index.js';
import { EVENTS, T0 } from './fixtures.js';

describe('record format', () => {
  it('round-trips events through JSONL with a version tag', () => {
    const text = EVENTS.map(toLine).join('');
    expect(text.split('\n')[0]).toContain(`"v":${EVENT_SCHEMA_VERSION}`);
    expect(parseLog(text)).toEqual({ events: EVENTS, skipped: 0 });
  });

  it('skips torn or invalid lines', () => {
    const text = `${toLine(EVENTS[0]!)}{"v":2,"type":"NOPE","at":"${T0}"}\n{"v":2,"type":"SESS\n\n`;
    expect(parseLog(text)).toEqual({ events: [EVENTS[0]], skipped: 2 });
  });

  it('migrates the pre-release v1 format', () => {
    expect(migrateRecord({ kind: 'SESSION_DONE', ts: T0, mins: 30 })).toEqual({
      type: 'SESSION_COMPLETED',
      at: T0,
      minutes: 30,
      v: 2,
    });
    expect(parseRecord({ v: 1, kind: 'HATCH', ts: T0, id: 'x', name: 'Old' })).toEqual({
      type: 'PET_CREATED',
      at: T0,
      id: 'x',
      name: 'Old',
    });
    expect(parseRecord({ v: 1, type: 'TICK', at: T0 })).toEqual({ type: 'TICK', at: T0 });
    expect(migrateRecord({ v: 99, type: 'TICK', at: T0 })).toBeNull();
    expect(migrateRecord('nope')).toBeNull();
    expect(migrateRecord([1])).toBeNull();
  });

  it('validates required fields per event type', () => {
    const bad: unknown[] = [
      { v: 2, type: 'TICK', at: 'yesterday' },
      { v: 2, type: 'PET_CREATED', at: T0, name: 'x' },
      { v: 2, type: 'SESSION_STARTED', at: T0 },
      { v: 2, type: 'SESSION_COMPLETED', at: T0, minutes: '25' },
      { v: 2, type: 'SESSION_ABANDONED', at: T0 },
      { v: 2, type: 'DISTRACTION_DETECTED', at: T0 },
      { v: 2, type: 'VACATION_SET', at: T0, on: 'yes' },
      { v: 2, type: 'SETTINGS_CHANGED', at: T0, settings: 3 },
      { v: 2, type: 5, at: T0 },
    ];
    for (const raw of bad) expect(parseRecord(raw)).toBeNull();
    expect(parseRecord({ v: 2, type: 'COMMIT_MADE', at: T0, sha: 'abc' })).toEqual({
      type: 'COMMIT_MADE',
      at: T0,
      sha: 'abc',
    });
  });
});

describe('computeState', () => {
  it('returns null without a pet', () => {
    expect(computeState([], null)).toBeNull();
    expect(computeState([{ type: 'TICK', at: T0 }], null)).toBeNull();
  });

  it('reuses a compatible snapshot and replays only newer events', () => {
    const snap = makeSnapshot(replay(EVENTS.slice(0, 2)), 2);
    const tampered = { ...snap, state: { ...snap.state, xp: 1000 } };
    expect(computeState(EVENTS, tampered)?.xp).toBe(1025);
  });

  it('ignores incompatible snapshots', () => {
    const snap = makeSnapshot(replay(EVENTS), 3);
    const expected = replay(EVENTS);
    expect(
      computeState(EVENTS, { ...snap, stateSchemaVersion: CONFIG.stateSchemaVersion + 1 }),
    ).toEqual(expected);
    expect(computeState(EVENTS, { ...snap, eventCount: 4 })).toEqual(expected);
    expect(computeState(EVENTS, { ...snap, state: { ...snap.state, id: 'other' } })).toEqual(
      expected,
    );
  });
});

describe('export / import', () => {
  it('round-trips', () => {
    const file = makeExport(EVENTS, T0);
    expect(parseExport(JSON.stringify(file))).toEqual(EVENTS);
    expect(parseExport(JSON.stringify(EVENTS))).toEqual(EVENTS);
  });

  it('rejects unusable files with friendly errors', () => {
    expect(() => parseExport('{')).toThrow(ImportError);
    expect(() => parseExport('{"hello":1}')).toThrow(/no "events" list/);
    expect(() => parseExport(JSON.stringify([EVENTS[0], { type: 'X' }]))).toThrow(/#2/);
    expect(() => parseExport(JSON.stringify([EVENTS[1]]))).toThrow(/PET_CREATED/);
  });
});
