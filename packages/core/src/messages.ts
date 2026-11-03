import type { Condition, PetState } from './types.js';

/**
 * Deterministic 32-bit FNV-1a hash of a string. Used wherever we need "random-looking" but
 * reproducible choices (message variants, journal phrasing).
 */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Picks one item from a non-empty list using a string seed. */
export function pick<T>(items: readonly T[], seed: string): T {
  return items[hashSeed(seed) % items.length]!;
}

const LINES: Record<Condition, readonly string[]> = {
  thriving: [
    'I feel amazing. Is this what flow tastes like?',
    'Fed, rested, and ready to ship. Let us go!',
    'My antennae are buzzing with good vibes.',
    'Best. Owner. Ever. Want to do one more session?',
    'I did a tiny happy spin while you were not looking.',
    'Everything compiles in my heart today.',
  ],
  content: [
    'Hi! I am here whenever you want to focus.',
    'Humming along. A session would be a nice snack.',
    'Just idling in the background, like a good daemon.',
    'I like it here. What are we building today?',
    'All quiet on stdout.',
    'Ready when you are. No pressure.',
  ],
  sad: [
    'I missed you a bit. Want to do a short one together?',
    'Feeling low. Even 15 minutes would cheer me up.',
    'It is okay. Small steps still count.',
    'A little gloomy today. A focus session would be nice.',
    'I saved a spot for you next to the terminal.',
  ],
  sick: [
    'I feel a bit under the weather. A gentle session would help.',
    'Achoo. Some focus time is my favourite medicine.',
    'Low on health. Short sessions and breaks, please.',
    'I am okay, just wobbly. Let us take it slow.',
    'Could you feed me a little focus? Small bites are fine.',
  ],
  hibernating: [
    'Zzz... (the cocoon glows softly)',
    'Zzz... dreaming of green builds...',
    'Zzz... two sessions and I will wake right up...',
    'Zzz... (a tiny antenna twitches)',
    'Zzz... no rush, I am cozy in here...',
  ],
};

const EGG_LINES: readonly string[] = [
  '(the egg wobbles hopefully)',
  '(something inside is humming a compile tune)',
  '(the egg feels warm — three sessions to hatch)',
  '(a tiny tap from inside: tap... tap...)',
  '(the shell glows a little when you focus)',
];

/**
 * A short line in the pet's voice for its current condition and stage. Deterministic: the same
 * state and seed (for example today's date) always produce the same line.
 */
export function petSays(state: PetState, seed: string = state.lastEventAt.slice(0, 10)): string {
  if (state.stage === 'egg' && state.condition !== 'hibernating') {
    return pick(EGG_LINES, `${seed}:${state.id}`);
  }
  if (state.activeSession && state.condition !== 'hibernating') {
    return pick(
      [
        'Shh, we are focusing. I am guarding the door.',
        'Deep work mode. I am very quietly cheering.',
        'You have got this. I will be right here.',
      ],
      `${seed}:${state.id}`,
    );
  }
  return pick(LINES[state.condition], `${seed}:${state.id}:${state.condition}`);
}

/** All variants per condition — exported for tests and UI previews. */
export const PET_LINES = LINES;
