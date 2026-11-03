import { describe, expect, it } from 'vitest';
import { replay, reduce } from '../src/index.js';
import type { EvolvedSpecies, PetEvent, PetState } from '../src/index.js';

/**
 * Replays 60 days of synthetic events for several work styles and checks that each pet evolves
 * into the expected species and never "dies" (health stays at or above the floor, the pet always
 * has a valid condition, and a neglected pet hibernates and wakes up instead).
 */

const START = Date.parse('2026-11-02T00:00:00.000Z');
const DAYS = 60;

/** ISO timestamp for day `d` at local (UTC) `hh:mm`. */
const at = (d: number, hh: number, mm = 0): string =>
  new Date(START + ((d * 24 + hh) * 60 + mm) * 60_000).toISOString();

function sessionAt(
  d: number,
  hh: number,
  mm: number,
  minutes: number,
  extras: (end: string) => PetEvent[] = () => [],
): PetEvent[] {
  const start = at(d, hh, mm);
  const end = new Date(Date.parse(start) + minutes * 60_000).toISOString();
  return [
    { type: 'SESSION_STARTED', at: start, plannedMinutes: minutes },
    ...extras(end),
    { type: 'SESSION_COMPLETED', at: end, minutes },
  ];
}

const breakAt = (d: number, hh: number, mm = 0, minutes = 12): PetEvent => ({
  type: 'BREAK_TAKEN',
  at: at(d, hh, mm),
  minutes,
});

interface Persona {
  name: string;
  expected: EvolvedSpecies;
  day: (d: number) => PetEvent[];
  /** Days with no activity at all. */
  absent?: (d: number) => boolean;
}

const commitsDuring = (d: number, hh: number) => (): PetEvent[] =>
  [5, 15, 25, 35].map((mm) => ({ type: 'COMMIT_MADE', at: at(d, hh, mm) }) as PetEvent);

const PERSONAS: Persona[] = [
  {
    name: 'night-owl deep worker',
    expected: 'owlbyte',
    day: (d) => [...sessionAt(d, 14, 0, 60), breakAt(d, 15, 5, 15), ...sessionAt(d, 23, 10, 60)],
  },
  {
    name: 'sprinter (with an 11-day absence)',
    expected: 'sprintail',
    absent: (d) => d >= 35 && d <= 45,
    day: (d) => [
      ...sessionAt(d, 9, 0, 25),
      ...sessionAt(d, 9, 30, 25),
      ...sessionAt(d, 10, 0, 25),
      breakAt(d, 10, 30, 15),
      ...sessionAt(d, 13, 0, 25),
      ...sessionAt(d, 13, 30, 25),
    ],
  },
  {
    name: 'balanced shipper',
    expected: 'shipwyrm',
    day: (d) => [
      ...sessionAt(d, 9, 0, 40, commitsDuring(d, 9)),
      breakAt(d, 10, 0),
      ...sessionAt(d, 11, 0, 40, commitsDuring(d, 11)),
      breakAt(d, 12, 0),
      ...sessionAt(d, 14, 0, 40, commitsDuring(d, 14)),
      { type: 'CI_PASSED', at: at(d, 15, 0) },
    ],
  },
  {
    name: 'zen breaker',
    expected: 'zenpaca',
    day: (d) => [
      ...sessionAt(d, 9, 0, 35),
      breakAt(d, 9, 40, 20),
      ...sessionAt(d, 11, 0, 35),
      breakAt(d, 11, 40, 20),
      ...sessionAt(d, 15, 0, 35),
      breakAt(d, 15, 40, 20),
    ],
  },
  {
    name: 'midnight coder',
    expected: 'nocturne',
    day: (d) => [...sessionAt(d, 23, 5, 35), ...sessionAt(d + 1, 0, 0, 35)],
  },
];

function simulate(persona: Persona): { final: PetState; daily: PetState[] } {
  let state = replay([
    {
      type: 'PET_CREATED',
      at: at(0, 8),
      id: persona.name,
      name: 'Sim',
      settings: { timezone: 'UTC', bedtimeHour: 23, wakeHour: 7, dailyGoalMinutes: 50 },
    },
  ]);
  const daily: PetState[] = [];
  for (let d = 0; d < DAYS; d++) {
    const events: PetEvent[] = persona.absent?.(d)
      ? [{ type: 'TICK', at: at(d, 21) }]
      : [
          ...persona.day(d),
          { type: 'PET_PETTED', at: at(d, 21) },
          { type: 'TICK', at: at(d, 21, 30) },
        ];
    for (const e of events) state = reduce(state, e);
    daily.push(state);
  }
  return { final: state, daily };
}

describe('60-day persona simulation', () => {
  for (const persona of PERSONAS) {
    it(`${persona.name} evolves into a ${persona.expected} and never dies`, () => {
      const { final, daily } = simulate(persona);
      expect(final.species).toBe(persona.expected);
      expect(['adult', 'elder']).toContain(final.stage);
      for (const s of daily) {
        expect(s.stats.health).toBeGreaterThanOrEqual(10);
        expect(['thriving', 'content', 'sad', 'sick', 'hibernating']).toContain(s.condition);
        for (const v of Object.values(s.stats)) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(100);
        }
      }
      // Species is fixed once adult.
      const adultDays = daily.filter((s) => s.stage === 'adult');
      expect(new Set(adultDays.map((s) => s.species))).toEqual(new Set([persona.expected]));
      expect(final.streak.best).toBeGreaterThanOrEqual(14);
    });
  }

  it('the absent sprinter hibernates, then wakes up with a welcome back', () => {
    const { daily, final } = simulate(PERSONAS[1]!);
    expect(daily.some((s) => s.condition === 'hibernating')).toBe(true);
    expect(final.condition).not.toBe('hibernating');
    expect(final.journal.some((j) => j.kind === 'welcome-back')).toBe(true);
    expect(final.streak.current).toBeGreaterThan(0);
  });

  it('is deterministic', () => {
    expect(simulate(PERSONAS[2]!).final).toEqual(simulate(PERSONAS[2]!).final);
  });
});
