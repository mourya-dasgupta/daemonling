import { describe, expect, it } from 'vitest';
import {
  addDays,
  awakeHoursBetween,
  daysBetween,
  isAwakeHour,
  isNight,
  isValidTimezone,
  localDay,
  localParts,
} from '../src/index.js';
import { CONFIG } from '../src/config.js';

const settings = { ...CONFIG.defaultSettings };

describe('time helpers', () => {
  it('computes local day and hour in a half-hour time zone', () => {
    const ms = Date.parse('2026-11-02T20:00:00Z');
    expect(localParts(ms, 'Asia/Kolkata')).toEqual({ day: '2026-11-03', hour: 1 });
    expect(localDay('2026-11-02T20:00:00Z', 'America/Los_Angeles')).toBe('2026-11-02');
  });

  it('falls back to UTC for unknown time zones', () => {
    expect(isValidTimezone('Mars/Olympus')).toBe(false);
    expect(localParts(Date.parse('2026-11-02T05:00:00Z'), 'Mars/Olympus').hour).toBe(5);
  });

  it('does calendar arithmetic across month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-11-01', '2026-11-08')).toBe(7);
  });

  it('knows awake hours with and without wrap-around', () => {
    expect(isAwakeHour(7, { wakeHour: 7, bedtimeHour: 23 })).toBe(true);
    expect(isAwakeHour(23, { wakeHour: 7, bedtimeHour: 23 })).toBe(false);
    expect(isAwakeHour(0, { wakeHour: 9, bedtimeHour: 1 })).toBe(true);
    expect(isAwakeHour(5, { wakeHour: 9, bedtimeHour: 1 })).toBe(false);
    expect(isAwakeHour(3, { wakeHour: 8, bedtimeHour: 8 })).toBe(true);
    expect(isNight('2026-11-02T23:30:00Z', settings)).toBe(true);
    expect(isNight('2026-11-02T12:00:00Z', settings)).toBe(false);
  });

  it('integrates awake hours, skipping the night', () => {
    const from = Date.parse('2026-11-02T22:00:00Z');
    const to = Date.parse('2026-11-03T08:30:00Z');
    expect(awakeHoursBetween(from, to, settings)).toBeCloseTo(2.5);
    expect(awakeHoursBetween(to, from, settings)).toBe(0);
  });

  it('stays exact across a DST change', () => {
    const ny = { ...settings, timezone: 'America/New_York' };
    // DST ended in New York at 06:00 UTC on 1 Nov 2026 (02:00 EDT -> 01:00 EST).
    expect(localParts(Date.parse('2026-11-01T05:30:00Z'), ny.timezone)).toEqual({
      day: '2026-11-01',
      hour: 1,
    });
    expect(localParts(Date.parse('2026-11-01T06:30:00Z'), ny.timezone)).toEqual({
      day: '2026-11-01',
      hour: 1,
    });
    const alwaysAwake = { ...ny, wakeHour: 0, bedtimeHour: 0 };
    const from = Date.parse('2026-10-31T12:00:00Z');
    const to = Date.parse('2026-11-01T18:00:00Z');
    expect(awakeHoursBetween(from, to, alwaysAwake)).toBeCloseTo(30);
    // Local 20:00 EDT on 31 Oct to 19:00 EST on 1 Nov: 3 awake hours, then 07:00–19:00.
    const day = awakeHoursBetween(
      Date.parse('2026-11-01T00:00:00Z'),
      Date.parse('2026-11-02T00:00:00Z'),
      ny,
    );
    expect(day).toBeCloseTo(15);
  });
});
