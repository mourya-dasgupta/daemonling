import { CONFIG } from './config.js';
import { addDays, isValidTimezone, localDay } from './time.js';
import type { JournalEntry, PetCreatedEvent, PetState, Settings } from './types.js';

/** Clamps a stat to 0..100. */
export function clampStat(value: number): number {
  return Math.min(CONFIG.stats.max, Math.max(CONFIG.stats.min, value));
}

/** Rounds to one decimal place (avoids floating-point noise in stored state). */
export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Merges a partial settings update into existing settings, ignoring invalid values (out-of-range
 * numbers are clamped, unknown time zones are rejected).
 */
export function mergeSettings(base: Settings, patch: Partial<Settings> | undefined): Settings {
  if (!patch) return { ...base };
  const limits = CONFIG.settingsLimits;
  return {
    dailyGoalMinutes: clampInt(
      patch.dailyGoalMinutes,
      limits.dailyGoalMinutes.min,
      limits.dailyGoalMinutes.max,
      base.dailyGoalMinutes,
    ),
    bedtimeHour: clampInt(patch.bedtimeHour, 0, 23, base.bedtimeHour),
    wakeHour: clampInt(patch.wakeHour, 0, 23, base.wakeHour),
    graceSeconds: clampInt(
      patch.graceSeconds,
      limits.graceSeconds.min,
      limits.graceSeconds.max,
      base.graceSeconds,
    ),
    timezone:
      typeof patch.timezone === 'string' && isValidTimezone(patch.timezone)
        ? patch.timezone
        : base.timezone,
  };
}

/** Trims and bounds a pet name; falls back to "Bit". */
export function cleanName(name: string | undefined): string {
  const trimmed = (name ?? '').replace(/\s+/g, ' ').trim().slice(0, 24);
  return trimmed.length > 0 ? trimmed : 'Bit';
}

/** Creates a brand-new pet (an egg) from its `PET_CREATED` event. */
export function createPet(event: PetCreatedEvent): PetState {
  const settings = mergeSettings({ ...CONFIG.defaultSettings }, event.settings);
  const today = localDay(event.at, settings.timezone);
  const name = cleanName(event.name);
  const born: JournalEntry = {
    at: event.at,
    kind: 'born',
    text: `An egg appeared. Its name is ${name}. It is warm and humming quietly.`,
  };
  return {
    schemaVersion: CONFIG.stateSchemaVersion,
    id: event.id,
    name,
    bornAt: event.at,
    stage: 'egg',
    species: 'unhatched',
    condition: 'content',
    stats: { ...CONFIG.stats.initial },
    xp: 0,
    traits: { depth: 0, sprint: 0, balance: 0, craft: 0, night: 0 },
    streak: { current: 0, best: 0, freezes: 0, lastCountedDay: null },
    tricks: [],
    settings,
    activeSession: null,
    vacation: false,
    lastEventAt: event.at,
    focusMinutesSinceBreak: 0,
    journal: [born],
    reactions: [],
    ledger: {
      day: today,
      dayFocusMinutes: 0,
      dayCommitsCounted: 0,
      dayBondFromPetting: 0,
      sessionDistractionPenalty: 0,
      streakCheckedThrough: addDays(today, -1),
      hungrySince: null,
      hungerPenaltiesApplied: 0,
      careClockAt: event.at,
      hibernating: false,
      wakeSessions: [],
      sessionsCompleted: 0,
      totalFocusMinutes: 0,
      lastSessionCompletedAt: null,
      victoryDanceUnlocked: false,
    },
  };
}

/** Appends a journal line, keeping only the most recent entries. */
export function addJournal(state: PetState, entry: JournalEntry): void {
  state.journal.push(entry);
  const extra = state.journal.length - CONFIG.journal.maxEntries;
  if (extra > 0) state.journal.splice(0, extra);
}
