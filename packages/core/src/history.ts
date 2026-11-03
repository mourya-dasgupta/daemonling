import { createPet } from './pet.js';
import { reduce } from './reducer.js';
import { pick } from './messages.js';
import { addDays, localDay, toMs } from './time.js';
import type { PetEvent, PetState } from './types.js';

/** What happened on one local calendar day. */
export interface DaySummary {
  day: string;
  sessions: number;
  minutes: number;
  longestSession: number;
  commits: number;
  breaks: number;
  lateSessions: number;
  honestStops: number;
}

function emptyDay(day: string): DaySummary {
  return {
    day,
    sessions: 0,
    minutes: 0,
    longestSession: 0,
    commits: 0,
    breaks: 0,
    lateSessions: 0,
    honestStops: 0,
  };
}

/** Result of replaying a log while collecting per-day totals. */
export interface History {
  state: PetState;
  days: Map<string, DaySummary>;
}

/**
 * Replays an event log (optionally only events before `untilIso`) and collects per-day totals in
 * the pet's time zone. Totals reflect what the rules actually credited.
 */
export function buildHistory(events: readonly PetEvent[], untilIso?: string): History {
  const [first, ...rest] = events;
  if (!first || first.type !== 'PET_CREATED') {
    throw new Error('Event log must start with PET_CREATED.');
  }
  const untilMs = untilIso === undefined ? Infinity : toMs(untilIso);
  const days = new Map<string, DaySummary>();
  let state = createPet(first);
  for (const event of rest) {
    if (!(toMs(event.at) < untilMs)) break;
    const before = state;
    state = reduce(state, event);
    const day = localDay(state.lastEventAt, state.settings.timezone);
    const summary = days.get(day) ?? emptyDay(day);
    const minutes = state.ledger.totalFocusMinutes - before.ledger.totalFocusMinutes;
    if (state.ledger.sessionsCompleted > before.ledger.sessionsCompleted) {
      summary.sessions += 1;
      summary.minutes += minutes;
      summary.longestSession = Math.max(summary.longestSession, minutes);
      if (state.traits.night > before.traits.night) summary.lateSessions += 1;
    }
    if (event.type === 'COMMIT_MADE') summary.commits += 1;
    if (state.traits.balance > before.traits.balance) summary.breaks += 1;
    if (event.type === 'DISTRACTION_REPORTED' && before.activeSession) summary.honestStops += 1;
    days.set(day, summary);
  }
  return { state, days };
}

/** Totals for the 7 days starting at `weekStart` (local `YYYY-MM-DD`). */
export interface WeekStats {
  weekStart: string;
  days: DaySummary[];
  sessions: number;
  minutes: number;
  longestSession: number;
  commits: number;
  breaks: number;
  lateSessions: number;
  bestDay: DaySummary | null;
}

/** Aggregates a week of day summaries (missing days count as empty). */
export function weekStats(days: Map<string, DaySummary>, weekStart: string): WeekStats {
  const week: DaySummary[] = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    week.push(days.get(day) ?? emptyDay(day));
  }
  const sum = (key: keyof Omit<DaySummary, 'day'>): number =>
    week.reduce((total, d) => total + d[key], 0);
  const best = week.reduce<DaySummary | null>(
    (top, d) => (d.minutes > 0 && (!top || d.minutes > top.minutes) ? d : top),
    null,
  );
  return {
    weekStart,
    days: week,
    sessions: sum('sessions'),
    minutes: Math.round(sum('minutes')),
    longestSession: Math.round(Math.max(0, ...week.map((d) => d.longestSession))),
    commits: sum('commits'),
    breaks: sum('breaks'),
    lateSessions: sum('lateSessions'),
    bestDay: best,
  };
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** English weekday name for a `YYYY-MM-DD` day. */
export function weekdayName(day: string): string {
  return WEEKDAYS[new Date(`${day}T12:00:00Z`).getUTCDay()]!;
}

/** Local day of the Monday on or before `day`. */
export function mondayOf(day: string): string {
  const dow = new Date(`${day}T12:00:00Z`).getUTCDay();
  return addDays(day, -((dow + 6) % 7));
}

const CLOSINGS = [
  'See you next week. I will be right here, humming.',
  'Thank you for taking care of me. And of you.',
  'Whatever next week brings, we will take it one session at a time.',
  'I am proud of us. Rest well this weekend.',
  'Same terminal, same time? I will keep the cursor warm.',
];

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Builds 4–8 warm sentences in the pet's voice summarising the week starting at `weekStart`
 * (local `YYYY-MM-DD`). Deterministic: the same events always give the same journal.
 */
export function buildWeeklyJournal(events: readonly PetEvent[], weekStart: string): string[] {
  const end = addDays(weekStart, 7);
  const { state, days } = buildHistory(events);
  // Streak as of the end of the week (or now, if the week is still running).
  const lastLocal = localDay(state.lastEventAt, state.settings.timezone);
  const streakState = lastLocal < end ? state : endOfWeekState(events, end, state);
  const w = weekStats(days, weekStart);
  const lines: string[] = [];

  if (w.sessions === 0) {
    lines.push('This week was quiet. I napped a lot and thought about you.');
    lines.push('Whenever you are ready, one short session is plenty to start.');
  } else {
    lines.push(
      `This week we did ${plural(w.sessions, 'focus session')} together: ${plural(w.minutes, 'minute')} of real focus.`,
    );
    lines.push(
      `Our longest session was ${plural(w.longestSession, 'minute')}. I did not blink once.`,
    );
    if (w.bestDay) {
      lines.push(
        `${weekdayName(w.bestDay.day)} was our biggest day, with ${plural(Math.round(w.bestDay.minutes), 'minute')}.`,
      );
    }
  }
  const streak = streakState.streak.current;
  lines.push(
    streak > 0
      ? `Our streak is at ${plural(streak, 'day')}. I keep count on my antennae.`
      : 'No streak right now, and that is fine: day one is always available.',
  );
  if (w.commits > 0) lines.push(`You fed me ${plural(w.commits, 'commit treat')}. Crunchy.`);
  if (w.breaks > 0) {
    lines.push(`We took ${plural(w.breaks, 'real break')}, and my antennae appreciated every one.`);
  } else if (w.minutes > 0) {
    lines.push('Next week, let us sprinkle in a few more breaks. I get dizzy without them.');
  }
  if (w.lateSessions > 0) {
    lines.push(
      `We stayed up late ${w.lateSessions === 1 ? 'once' : `${w.lateSessions} times`}. I am a little sleepy, but proud.`,
    );
  }
  lines.push(pick(CLOSINGS, `${weekStart}:${state.id}`));
  return lines.slice(0, 8);
}

function endOfWeekState(events: readonly PetEvent[], endDay: string, fallback: PetState): PetState {
  // Find the first instant of `endDay` by scanning events; the streak is settled lazily, so we
  // replay up to the first event on or after the end of the week.
  const tz = fallback.settings.timezone;
  const cutoff = events.find((e) => localDay(e.at, tz) >= endDay);
  return cutoff ? buildHistory(events, cutoff.at).state : fallback;
}
