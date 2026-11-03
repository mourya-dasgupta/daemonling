import type { Settings } from './types.js';

/** Milliseconds per unit, for readability. */
export const MS = { minute: 60_000, hour: 3_600_000, day: 86_400_000 } as const;

/** Parses an ISO timestamp to epoch milliseconds; invalid input yields `NaN`. */
export function toMs(iso: string): number {
  return Date.parse(iso);
}

/** Formats epoch milliseconds as an ISO-8601 UTC string. */
export function toIso(ms: number): string {
  return new Date(ms).toISOString();
}

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Returns true if `timezone` is an IANA zone name this runtime understands. */
export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

function formatterFor(timezone: string): Intl.DateTimeFormat {
  let fmt = formatters.get(timezone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: isValidTimezone(timezone) ? timezone : 'UTC',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    });
    formatters.set(timezone, fmt);
  }
  return fmt;
}

/** Every real-world UTC offset is a multiple of 15 minutes, so local hours change on these. */
const SLICE_MS = 15 * MS.minute;
const offsetCache = new Map<string, number>();

/**
 * UTC offset of `timezone` at instant `ms`, in milliseconds (local = UTC + offset). Cached per
 * 15-minute slice because `Intl` formatting is comparatively slow.
 */
export function utcOffsetMs(ms: number, timezone: string): number {
  const slice = Math.floor(ms / SLICE_MS);
  const key = `${timezone}|${slice}`;
  const cached = offsetCache.get(key);
  if (cached !== undefined) return cached;
  const at = slice * SLICE_MS;
  const parts = formatterFor(timezone).formatToParts(new Date(at));
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const local = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
  );
  const offset = local - at;
  if (offsetCache.size > 50_000) offsetCache.clear();
  offsetCache.set(key, offset);
  return offset;
}

/** Local calendar day (`YYYY-MM-DD`) and hour (0–23) of an instant in a time zone. */
export interface LocalParts {
  day: string;
  hour: number;
}

/** Converts an instant to its local day and hour in `timezone` (falls back to UTC if invalid). */
export function localParts(ms: number, timezone: string): LocalParts {
  const local = new Date(ms + utcOffsetMs(ms, timezone));
  return { day: local.toISOString().slice(0, 10), hour: local.getUTCHours() };
}

/** Local calendar day of an ISO timestamp. */
export function localDay(iso: string, timezone: string): string {
  return localParts(toMs(iso), timezone).day;
}

/** Adds `n` calendar days to a `YYYY-MM-DD` string. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Whole calendar days from `a` to `b` (positive when `b` is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / MS.day);
}

/** True if the pet is awake at this local hour, given the bedtime and wake hour. */
export function isAwakeHour(hour: number, settings: Pick<Settings, 'bedtimeHour' | 'wakeHour'>) {
  const { wakeHour, bedtimeHour } = settings;
  if (wakeHour === bedtimeHour) return true;
  if (wakeHour < bedtimeHour) return hour >= wakeHour && hour < bedtimeHour;
  return hour >= wakeHour || hour < bedtimeHour;
}

/** True if the instant falls in the pet's sleeping hours (after bedtime, before wake). */
export function isNight(iso: string, settings: Settings): boolean {
  return !isAwakeHour(localParts(toMs(iso), settings.timezone).hour, settings);
}

/** Awake milliseconds in a range of *local* wall-clock time (epoch ms shifted by the offset). */
function awakeMsInLocalRange(fromLocal: number, toLocal: number, settings: Settings): number {
  let awake = 0;
  let t = fromLocal;
  while (t < toLocal) {
    const hourIndex = Math.floor(t / MS.hour);
    const next = Math.min(toLocal, (hourIndex + 1) * MS.hour);
    if (isAwakeHour(((hourIndex % 24) + 24) % 24, settings)) awake += next - t;
    t = next;
  }
  return awake;
}

/**
 * Number of awake hours (fractional) between two instants. Works a day at a time: when the UTC
 * offset is the same at both ends of a day it integrates in local time directly; across a DST
 * change it walks 15-minute slices, so it is exact for every real time zone.
 */
export function awakeHoursBetween(fromMs: number, toMs: number, settings: Settings): number {
  if (!(toMs > fromMs)) return 0;
  const tz = settings.timezone;
  let awakeMs = 0;
  for (let chunk = fromMs; chunk < toMs; chunk += MS.day) {
    const end = Math.min(toMs, chunk + MS.day);
    const offset = utcOffsetMs(chunk, tz);
    if (offset === utcOffsetMs(end, tz)) {
      awakeMs += awakeMsInLocalRange(chunk + offset, end + offset, settings);
      continue;
    }
    for (let t = chunk; t < end;) {
      const next = Math.min(end, (Math.floor(t / SLICE_MS) + 1) * SLICE_MS);
      const o = utcOffsetMs(t, tz);
      awakeMs += awakeMsInLocalRange(t + o, next + o, settings);
      t = next;
    }
  }
  return awakeMs / MS.hour;
}
