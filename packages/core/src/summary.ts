import { petSays } from './messages.js';
import { MS, toMs } from './time.js';
import type { Condition, PetState, Species, Stage, Stats } from './types.js';

/** A compact, display-ready view of the pet. */
export interface PetSummary {
  name: string;
  stage: Stage;
  species: Species;
  condition: Condition;
  stats: Stats;
  xp: number;
  streak: number;
  bestStreak: number;
  freezes: number;
  tricks: string[];
  /** Seconds left in the active session (0 when overdue), or null when no session. */
  sessionRemainingSeconds: number | null;
  sessionTask: string | null;
  says: string;
  /** One line for status bars and shell prompts, e.g. `Bit · content · 🔥3 · 12:04 left`. */
  line: string;
}

/** Formats seconds as `m:ss`. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Summarises the pet for status lines. `nowIso` defaults to the time of the last event. */
export function summarize(state: PetState, nowIso: string = state.lastEventAt): PetSummary {
  const session = state.activeSession;
  const remaining = session
    ? Math.max(
        0,
        (toMs(session.startedAt) + session.plannedMinutes * MS.minute - toMs(nowIso)) / 1000,
      )
    : null;
  const round = (n: number): number => Math.round(n);
  const parts = [state.name, state.condition];
  if (state.streak.current > 0) parts.push(`streak ${state.streak.current}`);
  if (remaining !== null) parts.push(`${formatClock(remaining)} left`);
  return {
    name: state.name,
    stage: state.stage,
    species: state.species,
    condition: state.condition,
    stats: {
      satiety: round(state.stats.satiety),
      mood: round(state.stats.mood),
      health: round(state.stats.health),
      energy: round(state.stats.energy),
      bond: round(state.stats.bond),
    },
    xp: Math.floor(state.xp),
    streak: state.streak.current,
    bestStreak: state.streak.best,
    freezes: state.streak.freezes,
    tricks: [...state.tricks],
    sessionRemainingSeconds: remaining,
    sessionTask: session?.task ?? null,
    says: petSays(state, nowIso.slice(0, 10)),
    line: parts.join(' · '),
  };
}
