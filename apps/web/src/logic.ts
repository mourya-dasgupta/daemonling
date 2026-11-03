import { CONFIG, EVOLUTION_ORDER, summarize } from '@daemonling/core';
import type { EvolvedSpecies, PetState, TraitName } from '@daemonling/core';
import { moodFor } from '@daemonling/sprites';
import type { Mood } from '@daemonling/sprites';

/** What the Focus screen shows. */
export interface TimerView {
  phase: 'idle' | 'running' | 'done';
  remainingSeconds: number;
  plannedMinutes: number;
  /** 0..1 progress through the session. */
  progress: number;
  task: string | null;
}

/** Derives the timer display from the pet's active session at `nowMs`. */
export function timerView(state: PetState, nowMs: number): TimerView {
  const session = state.activeSession;
  if (!session) {
    return { phase: 'idle', remainingSeconds: 0, plannedMinutes: 0, progress: 0, task: null };
  }
  const totalMs = session.plannedMinutes * 60_000;
  const elapsed = nowMs - Date.parse(session.startedAt);
  const remainingSeconds = Math.min(
    totalMs / 1000,
    Math.max(0, Math.ceil((totalMs - elapsed) / 1000)),
  );
  return {
    phase: remainingSeconds === 0 ? 'done' : 'running',
    remainingSeconds,
    plannedMinutes: session.plannedMinutes,
    progress: Math.min(1, Math.max(0, elapsed / totalMs)),
    task: session.task ?? null,
  };
}

/** Whole minutes of the active session completed at `nowMs`. */
export function minutesDone(state: PetState, nowMs: number): number {
  if (!state.activeSession) return 0;
  return Math.max(0, Math.floor((nowMs - Date.parse(state.activeSession.startedAt)) / 60_000));
}

/** Everything the Den needs to draw the pet. */
export interface DenView {
  mood: Mood;
  label: string;
  says: string;
  stats: ReturnType<typeof summarize>['stats'];
}

const MOOD_LABEL: Record<Mood, string> = {
  egg: 'Waiting to hatch',
  idle: 'Content',
  happy: 'Happy',
  sad: 'A bit sad',
  sick: 'Under the weather',
  sleeping: 'Sleeping',
  cocoon: 'Hibernating in a cocoon',
  dance: 'Dancing!',
};

/** Maps pet state to the Den's mood, label and speech. */
export function denView(state: PetState, nowIso: string): DenView {
  const mood = moodFor(state, nowIso);
  const s = summarize(state, nowIso);
  return { mood, label: MOOD_LABEL[mood], says: s.says, stats: s.stats };
}

/** One row of the species-progress chart. */
export interface TraitShare {
  trait: TraitName;
  species: EvolvedSpecies;
  /** Weighted score used for evolution. */
  score: number;
  /** Share of the total weighted score, 0..1. */
  share: number;
}

/** Weighted trait shares, highest first — the species the pet is leaning toward comes first. */
export function traitShares(state: PetState): TraitShare[] {
  const rows = EVOLUTION_ORDER.map(([trait, species]) => ({
    trait,
    species,
    score: state.traits[trait] / CONFIG.traitWeights[trait],
  }));
  const total = rows.reduce((sum, r) => sum + r.score, 0);
  return rows
    .map((r) => ({ ...r, share: total > 0 ? r.score / total : 0 }))
    .sort((a, b) => b.score - a.score);
}

/** Downloads text as a file in the browser. */
export function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
