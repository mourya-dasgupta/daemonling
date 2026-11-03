import { describe, expect, it } from 'vitest';
import {
  buildHistory,
  buildWeeklyJournal,
  duckQuestion,
  duckSummary,
  DUCK_FALLBACKS,
  formatClock,
  hashSeed,
  mondayOf,
  PET_LINES,
  petSays,
  reduce,
  summarize,
  weekdayName,
} from '../src/index.js';
import type { Condition, PetEvent } from '../src/index.js';
import { newPet, plus, run, session, T0, withStats } from './helpers.js';

describe('petSays', () => {
  it('has at least 5 variants per condition', () => {
    for (const lines of Object.values(PET_LINES)) expect(lines.length).toBeGreaterThanOrEqual(5);
  });

  it('is deterministic for a seed and varies across seeds', () => {
    const pet = run(newPet(), ...session(T0, 30), ...session(T0, 30), ...session(T0, 30));
    expect(petSays(pet, '2026-11-02')).toBe(petSays(pet, '2026-11-02'));
    const seen = new Set(Array.from({ length: 30 }, (_, i) => petSays(pet, `seed-${i}`)));
    expect(seen.size).toBeGreaterThan(2);
    expect(petSays(pet)).toBe(petSays(pet, pet.lastEventAt.slice(0, 10)));
  });

  it('speaks for each condition, as an egg, and during a session', () => {
    const hatched = run(newPet(), ...session(T0, 30), ...session(T0, 30), ...session(T0, 30));
    const cases: Array<[Condition, Partial<typeof hatched.stats>]> = [
      ['sick', { health: 20 }],
      ['sad', { mood: 10 }],
      ['thriving', { mood: 90, satiety: 90, energy: 90 }],
    ];
    for (const [condition, stats] of cases) {
      const pet = reduce(withStats(hatched, stats), { type: 'TICK', at: hatched.lastEventAt });
      expect(pet.condition).toBe(condition);
      expect(PET_LINES[condition]).toContain(petSays(pet, 'x'));
    }
    expect(petSays(newPet(), 'x')).toMatch(/^\(/);
    const focusing = reduce(hatched, {
      type: 'SESSION_STARTED',
      at: hatched.lastEventAt,
      plannedMinutes: 25,
    });
    expect(petSays(focusing, 'x')).toMatch(/focus|cheering|right here/);
    const asleep = run(newPet(), { type: 'TICK', at: plus(T0, 8 * 24 * 60) });
    expect(PET_LINES.hibernating).toContain(petSays(asleep, 'x'));
  });

  it('hashes strings stably', () => {
    expect(hashSeed('daemonling')).toBe(hashSeed('daemonling'));
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
  });
});

describe('summarize', () => {
  it('builds a one-line status with remaining session time', () => {
    const pet = run(newPet(), {
      type: 'SESSION_STARTED',
      at: T0,
      plannedMinutes: 25,
      task: 'fix bug',
    });
    const s = summarize(pet, plus(T0, 10));
    expect(s.sessionRemainingSeconds).toBe(15 * 60);
    expect(s.sessionTask).toBe('fix bug');
    expect(s.line).toBe('Bit · content · 15:00 left');
    expect(summarize(pet, plus(T0, 60)).sessionRemainingSeconds).toBe(0);
  });

  it('includes the streak and rounds stats', () => {
    const pet = run(newPet({ dailyGoalMinutes: 10 }), ...session(T0, 13));
    const s = summarize(pet);
    expect(s.streak).toBe(1);
    expect(s.line).toContain('streak 1');
    expect(Number.isInteger(s.stats.energy)).toBe(true);
    expect(s.sessionRemainingSeconds).toBeNull();
    expect(s.sessionTask).toBeNull();
  });

  it('formats clocks', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(1505)).toBe('25:05');
    expect(formatClock(-3)).toBe('0:00');
  });
});

describe('weekly journal', () => {
  const created: PetEvent = {
    type: 'PET_CREATED',
    at: T0,
    id: 'pet-1',
    name: 'Bit',
    settings: { timezone: 'UTC' },
  };
  const d = (n: number, min = 0): string => plus(T0, n * 24 * 60 + min);

  function busyWeek(): PetEvent[] {
    const events: PetEvent[] = [created];
    for (let n = 0; n < 5; n++) {
      events.push(...session(d(n), 50));
      events.push({ type: 'BREAK_TAKEN', at: d(n, 55), minutes: 10 });
    }
    events.push({ type: 'SESSION_STARTED', at: d(1, 120), plannedMinutes: 90 });
    events.push({ type: 'COMMIT_MADE', at: d(1, 130) });
    events.push({ type: 'COMMIT_MADE', at: d(1, 140) });
    events.push({ type: 'SESSION_COMPLETED', at: d(1, 210), minutes: 90 });
    events.push(...session('2026-11-04T23:30:00.000Z', 30));
    return [created, ...events.slice(1).sort((a, b) => a.at.localeCompare(b.at))];
  }

  it('summarises a busy week in 4–8 warm sentences', () => {
    const lines = buildWeeklyJournal(busyWeek(), '2026-11-02');
    expect(lines.length).toBeGreaterThanOrEqual(4);
    expect(lines.length).toBeLessThanOrEqual(8);
    const text = lines.join(' ');
    expect(text).toContain('7 focus sessions');
    expect(text).toContain('370 minutes');
    expect(text).toContain('longest session was 90 minutes');
    expect(text).toContain('Tuesday was our biggest day');
    expect(text).toContain('2 commit treats');
    expect(text).toContain('5 real breaks');
    expect(text).toContain('late once');
    expect(text).toMatch(/streak is at 5 days/);
    expect(text).not.toMatch(/lazy|failed|disappointed|should have/i);
  });

  it('is deterministic', () => {
    expect(buildWeeklyJournal(busyWeek(), '2026-11-02')).toEqual(
      buildWeeklyJournal(busyWeek(), '2026-11-02'),
    );
  });

  it('is gentle about a quiet week', () => {
    const lines = buildWeeklyJournal([created, { type: 'TICK', at: d(20) }], '2026-11-09');
    expect(lines.length).toBeGreaterThanOrEqual(4);
    expect(lines[0]).toMatch(/quiet/);
    expect(lines.join(' ')).toMatch(/day one is always available/);
  });

  it('reports the streak as of the end of a past week and nudges toward breaks', () => {
    const events: PetEvent[] = [created];
    for (let n = 0; n < 9; n++) events.push(...session(d(n), 55));
    const lines = buildWeeklyJournal(events, '2026-11-02');
    expect(lines.join(' ')).toMatch(/streak is at 7 days/);
    expect(lines.join(' ')).toMatch(/more breaks/);
  });

  it('collects per-day history and can stop early', () => {
    const { days } = buildHistory(busyWeek());
    expect(days.get('2026-11-03')?.sessions).toBe(2);
    expect(days.get('2026-11-05')?.lateSessions).toBe(1);
    const partial = buildHistory(busyWeek(), d(1));
    expect(partial.state.ledger.sessionsCompleted).toBe(1);
    expect(() => buildHistory([])).toThrow();
    const honest = buildHistory([
      created,
      { type: 'SESSION_STARTED', at: T0, plannedMinutes: 25 },
      { type: 'DISTRACTION_REPORTED', at: T0, minutesDone: 5 },
    ]);
    expect(honest.days.get('2026-11-02')?.honestStops).toBe(1);
  });

  it('knows weekdays and Mondays', () => {
    expect(weekdayName('2026-11-02')).toBe('Monday');
    expect(mondayOf('2026-11-08')).toBe('2026-11-02');
    expect(mondayOf('2026-11-02')).toBe('2026-11-02');
  });
});

describe('rubber duck', () => {
  it('asks targeted questions by keyword', () => {
    expect(duckQuestion('I get an error when saving')).toBe(
      'What did you expect to happen instead?',
    );
    expect(duckQuestion('the test fails')).toBe('Which is the smallest failing case?');
    expect(duckQuestion('it is so slow')).toMatch(/time actually go/);
    expect(duckQuestion('works locally but not in prod')).toMatch(/environment/);
  });

  it('avoids repeating itself and falls back to generic questions', () => {
    const first = duckQuestion('error again');
    const second = duckQuestion('error again', [first]);
    expect(second).not.toBe(first);
    expect(second).toMatch(/first line of the error/);
    expect(DUCK_FALLBACKS).toContain(duckQuestion('hmm'));
    expect(duckQuestion('hmm', DUCK_FALLBACKS)).toBe(DUCK_FALLBACKS[0]);
  });

  it('summarises what was said', () => {
    expect(duckSummary([])[0]).toMatch(/did not say anything/);
    expect(duckSummary(['only one'])).toEqual([
      'You started with: "only one"',
      '1 thought out loud. Quack.',
    ]);
    const s = duckSummary(['the bug', 'maybe cache', ' ', 'found it: stale cache']);
    expect(s[0]).toContain('the bug');
    expect(s[1]).toContain('maybe cache');
    expect(s).toContain('Where you ended up: "found it: stale cache"');
  });
});
