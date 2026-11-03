import { describe, expect, it } from 'vitest';
import { CONFIG, createPet, reduce, replay } from '../src/index.js';
import type { PetEvent, PetState } from '../src/index.js';
import { newPet, plus, run, T0, withStats } from './helpers.js';

const start = (at = T0, plannedMinutes = 25, task?: string): PetEvent => ({
  type: 'SESSION_STARTED',
  at,
  plannedMinutes,
  ...(task ? { task } : {}),
});
const complete = (minutes: number, at = T0): PetEvent => ({
  type: 'SESSION_COMPLETED',
  at,
  minutes,
});
const tick = (at: string): PetEvent => ({ type: 'TICK', at });

describe('creation and replay', () => {
  it('creates an egg with defaults and a birth journal line', () => {
    const pet = newPet();
    expect(pet.stage).toBe('egg');
    expect(pet.species).toBe('unhatched');
    expect(pet.stats).toEqual(CONFIG.stats.initial);
    expect(pet.settings.dailyGoalMinutes).toBe(50);
    expect(pet.journal[0]?.kind).toBe('born');
  });

  it('cleans names and rejects invalid settings', () => {
    const pet = createPet({
      type: 'PET_CREATED',
      at: T0,
      id: 'x',
      name: '   ',
      settings: { timezone: 'Nope/Nowhere', dailyGoalMinutes: 5000, wakeHour: 7.4 },
    });
    expect(pet.name).toBe('Bit');
    expect(pet.settings.timezone).toBe('UTC');
    expect(pet.settings.dailyGoalMinutes).toBe(CONFIG.settingsLimits.dailyGoalMinutes.max);
    expect(pet.settings.wakeHour).toBe(7);
  });

  it('replays a log and requires PET_CREATED first', () => {
    expect(() => replay([])).toThrow(/PET_CREATED/);
    expect(() => replay([tick(T0)])).toThrow(/PET_CREATED/);
    const state = replay([
      { type: 'PET_CREATED', at: T0, id: 'p', name: 'Ada' },
      start(),
      complete(25),
      { type: 'PET_CREATED', at: T0, id: 'q', name: 'Other' },
    ]);
    expect(state.name).toBe('Ada');
    expect(state.xp).toBe(25);
  });

  it('is pure: reduce never mutates its input', () => {
    const pet = newPet();
    const frozen = JSON.stringify(pet);
    reduce(pet, start());
    reduce(pet, tick(plus(T0, 600)));
    expect(JSON.stringify(pet)).toBe(frozen);
  });

  it('treats out-of-order and invalid timestamps as "now"', () => {
    const pet = run(newPet(), tick(plus(T0, 60)));
    const back = reduce(pet, tick(T0));
    expect(back.lastEventAt).toBe(pet.lastEventAt);
    expect(back.stats).toEqual(pet.stats);
    const bad = reduce(pet, tick('not a date'));
    expect(bad.lastEventAt).toBe(pet.lastEventAt);
  });
});

describe('decay', () => {
  it('loses 2 satiety per awake hour and drifts mood toward 50', () => {
    const pet = run(newPet(), tick(plus(T0, 5 * 60)));
    expect(pet.stats.satiety).toBe(70 - 10);
    expect(pet.stats.mood).toBe(55);
    const low = run(withStats(newPet(), { mood: 40 }), tick(plus(T0, 3 * 60)));
    expect(low.stats.mood).toBe(43);
    const near = run(withStats(newPet(), { mood: 51 }), tick(plus(T0, 5 * 60)));
    expect(near.stats.mood).toBe(50);
  });

  it('recovers 4 energy per awake hour, but not during a session', () => {
    const idle = run(withStats(newPet(), { energy: 50 }), tick(plus(T0, 120)));
    expect(idle.stats.energy).toBe(58);
    const busy = run(withStats(newPet(), { energy: 50 }), start(T0, 120), tick(plus(T0, 120)));
    expect(busy.stats.energy).toBe(50);
  });

  it('does not decay during sleeping hours', () => {
    const night = newPet({}, '2026-11-02T23:00:00.000Z');
    const morning = run(night, tick('2026-11-03T07:00:00.000Z'));
    expect(morning.stats.satiety).toBe(70);
  });

  it('regains health slowly while well fed', () => {
    const pet = run(withStats(newPet(), { health: 50 }), tick(plus(T0, 3 * 60)));
    expect(pet.stats.health).toBe(53);
  });

  it('skips decay entirely on vacation', () => {
    const pet = run(newPet(), { type: 'VACATION_SET', at: T0, on: true }, tick(plus(T0, 48 * 60)));
    expect(pet.stats.satiety).toBe(70);
    expect(pet.condition).not.toBe('hibernating');
  });
});

describe('completed sessions', () => {
  it('feeds, cheers, teaches and bonds', () => {
    const pet = run(newPet(), start(), complete(25));
    expect(pet.stats.satiety).toBe(90);
    expect(pet.stats.mood).toBe(68);
    expect(pet.xp).toBe(25);
    expect(pet.stats.bond).toBe(1);
    expect(pet.stats.energy).toBe(77.5);
    expect(pet.traits.sprint).toBe(1);
    expect(pet.traits.depth).toBe(0);
    expect(pet.focusMinutesSinceBreak).toBe(25);
    expect(pet.activeSession).toBeNull();
    expect(pet.reactions[0]?.kind).toBe('happy');
  });

  it('caps satiety at 100 and grows depth for long sessions', () => {
    const pet = run(newPet(), start(T0, 60), complete(60));
    expect(pet.stats.satiety).toBe(100);
    expect(pet.traits.depth).toBe(1);
    expect(pet.traits.sprint).toBe(0);
  });

  it('heals +5 when sick', () => {
    const sick = run(withStats(newPet(), { health: 30 }), start(), complete(30));
    expect(sick.stats.health).toBe(35);
    const well = run(withStats(newPet(), { health: 80 }), start(), complete(30));
    expect(well.stats.health).toBe(80);
  });

  it('counts late sessions as night work and costs extra energy', () => {
    const late = '2026-11-02T23:30:00.000Z';
    const pet = run(newPet({}, late), start(late, 30), complete(30, late));
    expect(pet.traits.night).toBe(1);
    expect(pet.stats.energy).toBe(80 - 3 - 10);
    const early = '2026-11-03T06:00:00.000Z';
    expect(run(newPet(), start(early, 30), complete(30, early)).traits.night).toBe(1);
  });

  it('ignores completions without an active session, and clamps minutes', () => {
    const none = run(newPet(), complete(25));
    expect(none.xp).toBe(0);
    const huge = run(newPet(), start(), complete(10_000));
    expect(huge.xp).toBe(CONFIG.session.maxMinutes);
    const zero = run(newPet(), start(), complete(0));
    expect(zero.xp).toBe(0);
    expect(zero.activeSession).toBeNull();
    const nan = run(newPet(), start(), complete(Number.NaN));
    expect(nan.xp).toBe(0);
  });

  it('keeps an optional task label (trimmed to 120 chars)', () => {
    const pet = run(newPet(), start(T0, 25, 'x'.repeat(200)));
    expect(pet.activeSession?.task).toHaveLength(120);
    expect(
      run(newPet(), { type: 'SESSION_STARTED', at: T0, plannedMinutes: 0 }).activeSession
        ?.plannedMinutes,
    ).toBe(25);
  });

  it('quietly expires a forgotten session', () => {
    const pet = run(newPet(), start(T0, 25), tick(plus(T0, 25 + 121)));
    expect(pet.activeSession).toBeNull();
    expect(pet.xp).toBe(0);
    expect(pet.stats.mood).toBeGreaterThan(50);
  });
});

describe('stopping early: honesty pays', () => {
  it('silent abandon costs 10 mood and earns 0.2 xp per minute', () => {
    const pet = run(newPet(), start(), { type: 'SESSION_ABANDONED', at: T0, minutesDone: 10 });
    expect(pet.stats.mood).toBe(50);
    expect(pet.xp).toBe(2);
    expect(pet.activeSession).toBeNull();
  });

  it('an honest report costs 5 mood and earns 0.5 xp per minute', () => {
    const pet = run(newPet(), start(), { type: 'DISTRACTION_REPORTED', at: T0, minutesDone: 10 });
    expect(pet.stats.mood).toBe(55);
    expect(pet.xp).toBe(5);
  });

  it('honesty always pays better than silently quitting', () => {
    for (const minutesDone of [0, 1, 7, 24, 49, 120, 240]) {
      for (const mood of [0, 3, 30, 60, 100]) {
        const base = run(withStats(newPet(), { mood }), start(T0, 240));
        const honest = reduce(base, { type: 'DISTRACTION_REPORTED', at: T0, minutesDone });
        const silent = reduce(base, { type: 'SESSION_ABANDONED', at: T0, minutesDone });
        expect(honest.xp).toBeGreaterThanOrEqual(silent.xp);
        expect(honest.stats.mood).toBeGreaterThanOrEqual(silent.stats.mood);
        if (minutesDone > 0 || mood >= 10) {
          expect(honest.xp + honest.stats.mood).toBeGreaterThan(silent.xp + silent.stats.mood);
        }
      }
    }
  });

  it('ignores stops when no session is running', () => {
    const pet = run(newPet(), { type: 'SESSION_ABANDONED', at: T0, minutesDone: 10 });
    expect(pet.stats.mood).toBe(60);
  });
});

describe('distraction detection', () => {
  const away = (secondsAway: number, at = T0): PetEvent => ({
    type: 'DISTRACTION_DETECTED',
    at,
    secondsAway,
  });

  it('forgives time within the grace period', () => {
    expect(run(newPet(), start(), away(90)).stats.mood).toBe(60);
  });

  it('costs 2 mood per detection, at most 10 per session', () => {
    const once = run(newPet(), start(), away(91));
    expect(once.stats.mood).toBe(58);
    const many = run(newPet(), start(), ...Array.from({ length: 8 }, () => away(600)));
    expect(many.stats.mood).toBe(50);
    const next = run(many, complete(25), start(), away(600));
    expect(next.stats.mood).toBe(50 + 8 - 2);
  });

  it('is ignored outside a session', () => {
    expect(run(newPet(), away(600)).stats.mood).toBe(60);
  });
});

describe('breaks and overwork', () => {
  it('a 10+ minute break resets overwork, restores energy and grows balance', () => {
    const tired = run(withStats(newPet(), { energy: 40 }), start(), complete(25));
    const rested = reduce(tired, { type: 'BREAK_TAKEN', at: T0, minutes: 10 });
    expect(rested.focusMinutesSinceBreak).toBe(0);
    expect(rested.stats.energy).toBe(tired.stats.energy + 10);
    expect(rested.traits.balance).toBe(1);
    const short = reduce(tired, { type: 'BREAK_TAKEN', at: T0, minutes: 5 });
    expect(short.focusMinutesSinceBreak).toBe(25);
    expect(short.traits.balance).toBe(0);
  });

  it('more than 180 focused minutes without a break makes the pet yawn', () => {
    let pet = withStats(newPet(), { energy: 100 });
    pet = run(pet, start(T0, 90), complete(90), start(T0, 90), complete(90));
    expect(pet.focusMinutesSinceBreak).toBe(180);
    expect(pet.reactions.some((r) => r.kind === 'yawn')).toBe(false);
    const before = pet;
    pet = run(pet, start(T0, 10), complete(10));
    expect(pet.reactions.some((r) => r.kind === 'yawn')).toBe(true);
    expect(pet.stats.energy).toBe(before.stats.energy - 1 - 15);
    expect(pet.stats.mood).toBe(Math.min(100, before.stats.mood + 8) - 5);
    expect(pet.journal.some((j) => j.kind === 'overwork')).toBe(true);
  });

  it('a long idle gap counts as a natural break', () => {
    const pet = run(newPet(), start(), complete(100));
    const later = reduce(pet, tick(plus(T0, 45)));
    expect(later.focusMinutesSinceBreak).toBe(0);
  });
});

describe('commits and CI', () => {
  const commit = (at = T0): PetEvent => ({ type: 'COMMIT_MADE', at, sha: 'abc123' });

  it('a commit during a session is a treat', () => {
    const pet = run(withStats(newPet(), { satiety: 50 }), start(), commit());
    expect(pet.stats.satiety).toBe(53);
    expect(pet.traits.craft).toBe(1);
  });

  it('commits outside sessions record nothing', () => {
    const pet = run(newPet(), commit());
    expect(pet.traits.craft).toBe(0);
    expect(pet.stats.satiety).toBe(70);
  });

  it('counts at most 10 commits per day, resetting the next day', () => {
    let pet = run(newPet(), start(T0, 120), ...Array.from({ length: 15 }, () => commit()));
    expect(pet.traits.craft).toBe(10);
    const tomorrow = '2026-11-03T09:00:00.000Z';
    pet = run(pet, complete(30), start(tomorrow, 30), commit(tomorrow));
    expect(pet.traits.craft).toBe(11);
  });

  it('CI passing cheers the pet and unlocks the victory dance', () => {
    const pet = run(newPet(), { type: 'CI_PASSED', at: T0 });
    expect(pet.stats.mood).toBe(65);
    expect(pet.traits.craft).toBe(2);
    expect(pet.ledger.victoryDanceUnlocked).toBe(true);
    expect(pet.reactions[0]?.kind).toBe('victory-dance');
  });
});

describe('hunger and health', () => {
  // Wake and bedtime equal: always awake, so decay is easy to reason about.
  const allDay = { wakeHour: 0, bedtimeHour: 0 };

  it('loses 5 health per day once hungry for more than 24 hours, never below 10', () => {
    let pet = withStats(newPet(allDay), { satiety: 20, health: 30 });
    pet = run(pet, tick(plus(T0, 60)));
    expect(pet.ledger.hungrySince).not.toBeNull();
    pet = run(pet, tick(plus(T0, 24 * 60)));
    expect(pet.stats.health).toBe(30);
    pet = run(pet, tick(plus(T0, 26 * 60)));
    expect(pet.stats.health).toBe(25);
    pet = run(pet, tick(plus(T0, 50 * 60)));
    expect(pet.stats.health).toBe(20);
    pet = run(pet, tick(plus(T0, 6 * 24 * 60)));
    expect(pet.stats.health).toBe(10);
    expect(pet.condition).toBe('sick');
  });

  it('eating stops the hunger clock', () => {
    let pet = withStats(newPet(allDay), { satiety: 21 });
    pet = run(pet, tick(plus(T0, 60)), start(plus(T0, 60), 25), complete(25, plus(T0, 85)));
    expect(pet.ledger.hungrySince).toBeNull();
  });
});

describe('petting', () => {
  it('adds 0.5 bond (max 3 per day) and 1 mood', () => {
    const pet: PetState = run(
      newPet(),
      ...Array.from({ length: 10 }, () => ({ type: 'PET_PETTED', at: T0 }) as PetEvent),
    );
    expect(pet.stats.bond).toBe(3);
    expect(pet.stats.mood).toBe(70);
    const tomorrow = reduce(pet, { type: 'PET_PETTED', at: '2026-11-03T10:00:00.000Z' });
    expect(tomorrow.stats.bond).toBe(3.5);
  });
});

describe('settings', () => {
  it('merges valid settings and renames', () => {
    const pet = run(newPet(), {
      type: 'SETTINGS_CHANGED',
      at: T0,
      settings: { dailyGoalMinutes: 90, timezone: 'Asia/Kolkata', graceSeconds: 1 },
      name: 'Pixel',
    });
    expect(pet.settings.dailyGoalMinutes).toBe(90);
    expect(pet.settings.timezone).toBe('Asia/Kolkata');
    expect(pet.settings.graceSeconds).toBe(CONFIG.settingsLimits.graceSeconds.min);
    expect(pet.name).toBe('Pixel');
  });
});

describe('conditions', () => {
  const at = (state: PetState) => reduce(state, tick(T0)).condition;
  it('derives sick, sad, thriving and content in priority order', () => {
    expect(at(withStats(newPet(), { health: 39, mood: 10 }))).toBe('sick');
    expect(at(withStats(newPet(), { mood: 29 }))).toBe('sad');
    expect(at(withStats(newPet(), { mood: 70, satiety: 60, energy: 50 }))).toBe('thriving');
    expect(at(withStats(newPet(), { mood: 70, satiety: 59, energy: 50 }))).toBe('content');
    expect(at(newPet())).toBe('content');
  });
});

describe('hibernation', () => {
  it('curls into a cocoon after 7 days without a completed session; decay stops', () => {
    let pet = run(newPet(), tick(plus(T0, 6 * 24 * 60)));
    expect(pet.condition).not.toBe('hibernating');
    pet = run(pet, tick(plus(T0, 7 * 24 * 60)));
    expect(pet.condition).toBe('hibernating');
    expect(pet.journal.at(-1)?.kind).toBe('hibernate');
    const frozen = pet.stats;
    pet = run(pet, tick(plus(T0, 30 * 24 * 60)));
    expect(pet.stats).toEqual(frozen);
    expect(pet.stats.health).toBeGreaterThanOrEqual(CONFIG.hunger.healthFloor);
  });

  it('wakes after 2 completed sessions within 48 hours, with +20 mood and no penalty', () => {
    let pet = run(newPet(), tick(plus(T0, 8 * 24 * 60)));
    const day9 = plus(T0, 9 * 24 * 60);
    pet = run(pet, start(day9, 25), complete(25, plus(day9, 25)));
    expect(pet.condition).toBe('hibernating');
    const moodBefore = pet.stats.mood;
    pet = run(pet, start(plus(day9, 30), 25), complete(25, plus(day9, 55)));
    expect(pet.condition).not.toBe('hibernating');
    expect(pet.stats.mood).toBeCloseTo(Math.min(100, moodBefore + 8 + 20), 0);
    expect(pet.journal.at(-1)?.kind).toBe('welcome-back');
    expect(pet.reactions.some((r) => r.kind === 'welcome-back')).toBe(true);
  });

  it('two sessions more than 48 hours apart do not wake it', () => {
    let pet = run(newPet(), tick(plus(T0, 8 * 24 * 60)));
    const a = plus(T0, 9 * 24 * 60);
    const b = plus(T0, 12 * 24 * 60);
    pet = run(
      pet,
      start(a, 25),
      complete(25, plus(a, 25)),
      start(b, 25),
      complete(25, plus(b, 25)),
    );
    expect(pet.condition).toBe('hibernating');
  });

  it('vacation pauses the hibernation clock and hunger', () => {
    let pet = run(newPet(), { type: 'VACATION_SET', at: T0, on: true });
    pet = run(pet, { type: 'VACATION_SET', at: T0, on: true });
    pet = run(pet, tick(plus(T0, 14 * 24 * 60)));
    expect(pet.condition).not.toBe('hibernating');
    pet = run(pet, { type: 'VACATION_SET', at: plus(T0, 14 * 24 * 60), on: false });
    expect(pet.vacation).toBe(false);
    pet = run(pet, tick(plus(T0, 20 * 24 * 60)));
    expect(pet.condition).not.toBe('hibernating');
  });
});
