/**
 * @daemonling/core — the pure, deterministic pet simulation. No I/O, no clocks, no randomness:
 * every function is a function of its inputs, and time comes only from event timestamps.
 */
export { CONFIG } from './config.js';
export type { Config } from './config.js';
export * from './types.js';
export { createPet, mergeSettings, cleanName } from './pet.js';
export { reduce, replay } from './reducer.js';
export { deriveCondition, evolve, ageDays, EVOLUTION_ORDER } from './progression.js';
export { petSays, PET_LINES, hashSeed, pick } from './messages.js';
export { summarize, formatClock } from './summary.js';
export type { PetSummary } from './summary.js';
export { buildHistory, buildWeeklyJournal, weekStats, weekdayName, mondayOf } from './history.js';
export type { DaySummary, History, WeekStats } from './history.js';
export { duckQuestion, duckSummary, DUCK_RULES, DUCK_FALLBACKS } from './duck.js';
export {
  localDay,
  localParts,
  addDays,
  daysBetween,
  isAwakeHour,
  isNight,
  isValidTimezone,
  awakeHoursBetween,
} from './time.js';

/** Package version, kept in sync with package.json. */
export const VERSION = '0.1.0';
