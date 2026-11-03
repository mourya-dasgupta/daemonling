import { isNight } from '@daemonling/core';
import type { PetState, Species } from '@daemonling/core';

/** The visual moods every renderer supports. */
export type Mood = 'egg' | 'idle' | 'happy' | 'sad' | 'sick' | 'sleeping' | 'cocoon' | 'dance';

export const MOODS: readonly Mood[] = [
  'egg',
  'idle',
  'happy',
  'sad',
  'sick',
  'sleeping',
  'cocoon',
  'dance',
];

/**
 * Maps a pet's state to the mood to draw. `nowIso` decides whether it is the pet's bedtime;
 * defaults to the time of the last event.
 */
export function moodFor(state: PetState, nowIso: string = state.lastEventAt): Mood {
  if (state.condition === 'hibernating') return 'cocoon';
  if (state.stage === 'egg') return 'egg';
  if (state.reactions.some((r) => r.kind === 'victory-dance' || r.kind === 'welcome-back')) {
    return 'dance';
  }
  if (state.condition === 'sick') return 'sick';
  if (state.condition === 'sad') return 'sad';
  if (!state.activeSession && isNight(nowIso, state.settings)) return 'sleeping';
  if (state.condition === 'thriving' || state.reactions.some((r) => r.kind === 'happy')) {
    return 'happy';
  }
  return 'idle';
}

const FACES: Record<Mood, string> = {
  egg: '(  )',
  idle: '(o.o)',
  happy: '(^o^)',
  sad: '(;_;)',
  sick: '(@_@)',
  sleeping: '(-.-)z',
  cocoon: '(zzz)',
  dance: '\\(^o^)/',
};

/** A tiny one-line face for status bars and shell prompts (plain ASCII). */
export function faceFor(mood: Mood): string {
  return FACES[mood];
}

/** Human-readable species names. */
export const SPECIES_LABEL: Record<Species, string> = {
  unhatched: 'egg',
  sprout: 'sprout',
  owlbyte: 'owlbyte',
  sprintail: 'sprintail',
  zenpaca: 'zenpaca',
  shipwyrm: 'shipwyrm',
  nocturne: 'nocturne',
};
