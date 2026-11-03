import { CONFIG } from './config.js';
import { addJournal } from './pet.js';
import { addDays, MS, toMs } from './time.js';
import type { Condition, EvolvedSpecies, PetState, TraitName } from './types.js';

/**
 * Derives the pet's condition from its state. Order matters: hibernating, then sick, then sad,
 * then thriving, else content.
 */
export function deriveCondition(state: PetState): Condition {
  const c = CONFIG.conditions;
  const { stats } = state;
  if (state.ledger.hibernating) return 'hibernating';
  if (stats.health < c.sickBelowHealth) return 'sick';
  if (stats.mood < c.sadBelowMood) return 'sad';
  if (
    stats.mood >= c.thriving.mood &&
    stats.satiety >= c.thriving.satiety &&
    stats.energy >= c.thriving.energy
  ) {
    return 'thriving';
  }
  return 'content';
}

/** Trait → species, in tie-break order. */
export const EVOLUTION_ORDER: ReadonlyArray<[TraitName, EvolvedSpecies]> = [
  ['depth', 'owlbyte'],
  ['sprint', 'sprintail'],
  ['balance', 'zenpaca'],
  ['craft', 'shipwyrm'],
  ['night', 'nocturne'],
];

/**
 * Picks the evolved species from the dominant weighted trait. Ties resolve in the order depth,
 * sprint, balance, craft, night.
 */
export function evolve(traits: Record<TraitName, number>): EvolvedSpecies {
  let best = EVOLUTION_ORDER[0]!;
  let bestScore = -Infinity;
  for (const pair of EVOLUTION_ORDER) {
    const score = traits[pair[0]] / CONFIG.traitWeights[pair[0]];
    if (score > bestScore) {
      best = pair;
      bestScore = score;
    }
  }
  return best[1];
}

/** Whole days since the pet was born, at instant `nowMs`. */
export function ageDays(state: PetState, nowMs: number): number {
  return Math.floor((nowMs - toMs(state.bornAt)) / MS.day);
}

const SPECIES_BLURB: Record<EvolvedSpecies, string> = {
  owlbyte: 'an owlbyte — calm-eyed and deep-thinking, like the long sessions that raised it',
  sprintail: 'a sprintail — quick, bright, and trailing a streak of short sprints',
  zenpaca: 'a zenpaca — fluffy and unhurried, raised on good breaks',
  shipwyrm: 'a shipwyrm — a tiny dragon guarding a chest of commits',
  nocturne: 'a nocturne — moon-marked, raised in the quiet hours',
};

/** Advances the life stage (possibly several steps) and evolves the species at adulthood. */
export function advanceStage(state: PetState, at: string): void {
  const s = CONFIG.stages;
  const age = ageDays(state, toMs(at));
  for (;;) {
    if (state.stage === 'egg' && state.ledger.sessionsCompleted >= s.hatchAfterSessions) {
      state.stage = 'hatchling';
      state.species = 'sprout';
      state.reactions.push({ kind: 'hatched', text: 'Crack! Hello, world.' });
      addJournal(state, {
        at,
        kind: 'hatched',
        text: `${state.name} hatched after three focus sessions. First words: "hello, world".`,
      });
    } else if (state.stage === 'hatchling' && state.xp >= s.juvenileXp) {
      state.stage = 'juvenile';
      addJournal(state, { at, kind: 'stage', text: `${state.name} is a juvenile now.` });
    } else if (state.stage === 'juvenile' && state.xp >= s.adultXp && age >= s.adultMinAgeDays) {
      state.stage = 'adult';
      state.species = evolve(state.traits);
      state.reactions.push({ kind: 'evolved', text: `I became a ${state.species}!` });
      addJournal(state, {
        at,
        kind: 'evolved',
        text: `${state.name} grew up into ${SPECIES_BLURB[state.species]}.`,
      });
    } else if (state.stage === 'adult' && age >= s.elderMinAgeDays) {
      state.stage = 'elder';
      addJournal(state, {
        at,
        kind: 'stage',
        text: `${state.name} is an elder now: wise, a little slower, very proud of you.`,
      });
    } else {
      return;
    }
  }
}

/** Learns any trick whose streak or bond requirement is met. Tricks are never removed. */
export function learnTricks(state: PetState, at: string): void {
  const learn = (trick: string): void => {
    if (state.tricks.includes(trick)) return;
    state.tricks.push(trick);
    state.reactions.push({ kind: 'learned-trick', text: `New trick: ${trick}!` });
    addJournal(state, { at, kind: 'trick', text: `${state.name} learned a new trick: ${trick}.` });
  };
  for (const { streak, trick } of CONFIG.streakTricks) {
    if (state.streak.current >= streak) learn(trick);
  }
  if (state.stats.bond >= CONFIG.bondTrick.bond) learn(CONFIG.bondTrick.trick);
}

/**
 * Settles the streak for every day from the last checked day up to (not including) `today`.
 * A missed day spends a freeze if one is banked, otherwise resets the streak. Vacation days are
 * skipped entirely.
 */
export function settleStreak(state: PetState, today: string, at: string): void {
  const { ledger, streak } = state;
  const yesterday = addDays(today, -1);
  if (ledger.streakCheckedThrough >= yesterday) return;
  if (!state.vacation) {
    let day = addDays(ledger.streakCheckedThrough, 1);
    while (day <= yesterday && streak.current > 0) {
      if (day !== streak.lastCountedDay) {
        if (streak.freezes > 0) {
          streak.freezes -= 1;
          addJournal(state, {
            at,
            kind: 'freeze',
            text: `We used a streak freeze for ${day}. The streak is safe at ${streak.current}.`,
          });
        } else {
          addJournal(state, {
            at,
            kind: 'streak',
            text: `Our ${streak.current}-day streak ended. Every streak starts with day one.`,
          });
          streak.current = 0;
        }
      }
      day = addDays(day, 1);
    }
  }
  ledger.streakCheckedThrough = yesterday;
}

/** Counts `today` toward the streak once its focus minutes reach the daily goal. */
export function countStreakDay(state: PetState, today: string, at: string): void {
  const { streak } = state;
  if (state.vacation || streak.lastCountedDay === today) return;
  if (state.ledger.dayFocusMinutes < state.settings.dailyGoalMinutes) return;
  streak.current += 1;
  streak.best = Math.max(streak.best, streak.current);
  streak.lastCountedDay = today;
  if (streak.current % CONFIG.streak.freezeEvery === 0) {
    if (streak.freezes < CONFIG.streak.maxFreezes) {
      streak.freezes += 1;
      addJournal(state, {
        at,
        kind: 'freeze',
        text: `${streak.current} days in a row! We earned a streak freeze (${streak.freezes} banked).`,
      });
    }
  }
}
