import { describe, expect, it } from 'vitest';
import { CONFIG, evolve, reduce } from '../src/index.js';
import type { PetEvent, PetState } from '../src/index.js';
import { focus, newPet, plus, run, T0, withStats } from './helpers.js';

/** 09:00 UTC on day `n` after T0. */
const day = (n: number, minutesAfter9 = 0): string => plus(T0, n * 24 * 60 + minutesAfter9);
const tick = (at: string): PetEvent => ({ type: 'TICK', at });
const vacation = (on: boolean, at: string): PetEvent => ({ type: 'VACATION_SET', at, on });

/** Meets the daily goal (50 minutes) on each listed day. */
function focusDays(state: PetState, days: number[], minutes = 50): PetState {
  return days.reduce((s, n) => focus(s, day(n), minutes), state);
}

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe('streaks', () => {
  it('counts a day once completed focus minutes reach the daily goal', () => {
    let pet = focus(newPet(), day(0), 25);
    expect(pet.streak.current).toBe(0);
    pet = focus(pet, day(0, 30), 25);
    expect(pet.streak.current).toBe(1);
    expect(pet.streak.lastCountedDay).toBe('2026-11-02');
    pet = focus(pet, day(0, 60), 25);
    expect(pet.streak.current).toBe(1);
  });

  it('resets after a missed day with no freezes', () => {
    let pet = focusDays(newPet(), [0, 1]);
    expect(pet.streak.current).toBe(2);
    pet = run(pet, tick(day(3)));
    expect(pet.streak.current).toBe(0);
    expect(pet.streak.best).toBe(2);
    expect(pet.journal.at(-1)?.text).toMatch(/streak ended/);
  });

  it('earns a freeze every 7 days and spends it on a missed day', () => {
    let pet = focusDays(newPet(), range(0, 6));
    expect(pet.streak.current).toBe(7);
    expect(pet.streak.freezes).toBe(1);
    pet = focusDays(pet, [8]);
    expect(pet.streak.current).toBe(8);
    expect(pet.streak.freezes).toBe(0);
    expect(pet.journal.some((j) => j.kind === 'freeze' && j.text.includes('2026-11-09'))).toBe(
      true,
    );
  });

  it('banks at most 2 freezes', () => {
    const pet = focusDays(newPet(), range(0, 20));
    expect(pet.streak.current).toBe(21);
    expect(pet.streak.freezes).toBe(CONFIG.streak.maxFreezes);
  });

  it('vacation days neither count nor break the streak', () => {
    let pet = focusDays(newPet(), [0, 1]);
    pet = run(pet, vacation(true, day(2)));
    pet = focus(pet, day(3), 60);
    expect(pet.streak.current).toBe(2);
    pet = run(pet, tick(day(5)), vacation(false, day(6, 600)));
    expect(pet.streak.current).toBe(2);
    pet = run(pet, tick(day(7)));
    expect(pet.streak.current).toBe(2);
    pet = focusDays(pet, [7]);
    expect(pet.streak.current).toBe(3);
  });
});

describe('tricks', () => {
  it('learns streak tricks in order and never forgets them', () => {
    let pet = withStats(newPet({ dailyGoalMinutes: 10 }), {});
    pet = focusDays(pet, range(0, 2), 10);
    expect(pet.tricks).toEqual(['wave']);
    pet = focusDays(pet, range(3, 29), 10);
    expect(pet.tricks).toEqual([
      'wave',
      'rubber-duck',
      'fetch-todos',
      'victory-dance',
      'signature-move',
    ]);
    pet = run(pet, tick(day(40)));
    expect(pet.streak.current).toBe(0);
    expect(pet.tricks).toHaveLength(5);
  });

  it('learns purr at bond 50', () => {
    const pet = reduce(withStats(newPet(), { bond: 50 }), tick(T0));
    expect(pet.tricks).toContain('purr');
    expect(pet.reactions.some((r) => r.kind === 'learned-trick')).toBe(true);
  });
});

describe('stages', () => {
  it('hatches after 3 completed sessions', () => {
    let pet = focusDays(newPet(), [0], 10);
    pet = focus(pet, day(0, 20), 10);
    expect(pet.stage).toBe('egg');
    pet = focus(pet, day(0, 40), 10);
    expect(pet.stage).toBe('hatchling');
    expect(pet.species).toBe('sprout');
    expect(pet.reactions.some((r) => r.kind === 'hatched')).toBe(true);
  });

  it('becomes a juvenile at 300 xp, an adult at 1500 xp and 14 days, an elder at 90 days', () => {
    let pet = newPet();
    for (let i = 0; i < 3; i++) pet = focus(pet, day(0, i * 5), 100);
    expect(pet.stage).toBe('juvenile');
    for (let i = 0; i < 5; i++) pet = focus(pet, day(1, i * 5), 240);
    expect(pet.xp).toBeGreaterThanOrEqual(1500);
    expect(pet.stage).toBe('juvenile');
    pet = run(pet, tick(day(14)));
    expect(pet.stage).toBe('adult');
    expect(pet.species).toBe('owlbyte');
    expect(pet.journal.some((j) => j.kind === 'evolved')).toBe(true);
    pet = run(pet, tick(day(89)));
    expect(pet.stage).toBe('adult');
    pet = run(pet, tick(day(90)));
    expect(pet.stage).toBe('elder');
    expect(pet.species).toBe('owlbyte');
  });
});

describe('evolution', () => {
  const zero = { depth: 0, sprint: 0, balance: 0, craft: 0, night: 0 };
  it('picks the dominant weighted trait', () => {
    expect(evolve({ ...zero, depth: 5 })).toBe('owlbyte');
    expect(evolve({ ...zero, sprint: 5 })).toBe('sprintail');
    expect(evolve({ ...zero, balance: 5 })).toBe('zenpaca');
    expect(evolve({ ...zero, craft: 5 })).toBe('shipwyrm');
    expect(evolve({ ...zero, night: 5 })).toBe('nocturne');
  });

  it('normalizes by trait weight (commits are cheap)', () => {
    expect(evolve({ ...zero, depth: 10, craft: 25 })).toBe('owlbyte');
    expect(evolve({ ...zero, depth: 10, craft: 31 })).toBe('shipwyrm');
  });

  it('breaks ties in the order depth, sprint, balance, craft, night', () => {
    expect(evolve(zero)).toBe('owlbyte');
    expect(evolve({ ...zero, depth: 3, night: 3 })).toBe('owlbyte');
    expect(evolve({ ...zero, sprint: 3, balance: 3 })).toBe('sprintail');
    expect(evolve({ ...zero, balance: 3, craft: 6, night: 2 })).toBe('zenpaca');
    expect(evolve({ ...zero, craft: 3, night: 1 })).toBe('shipwyrm');
    expect(evolve({ ...zero, craft: 3, night: 2 })).toBe('nocturne');
  });
});
