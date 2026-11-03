// @vitest-environment jsdom
/// <reference lib="dom" />
import { describe, expect, it } from 'vitest';
import { createPet, reduce } from '@daemonling/core';
import type { PetEvent, PetState, Species } from '@daemonling/core';
import {
  ASCII_MAX_WIDTH,
  asciiFrame,
  asciiFrames,
  escapeXml,
  faceFor,
  moodFor,
  MOODS,
  renderCard,
  renderPetSvg,
} from '../src/index.js';

const SPECIES: Species[] = [
  'unhatched',
  'sprout',
  'owlbyte',
  'sprintail',
  'zenpaca',
  'shipwyrm',
  'nocturne',
];
const T0 = '2026-11-02T09:00:00.000Z';

function parse(svg: string): Document {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
  return doc;
}

function pet(events: PetEvent[] = [], name = 'Bit'): PetState {
  const base = createPet({
    type: 'PET_CREATED',
    at: T0,
    id: 'p',
    name,
    settings: { timezone: 'UTC' },
  });
  return events.reduce(reduce, base);
}

const sessions = (n: number): PetEvent[] =>
  Array.from({ length: n }, (): PetEvent[] => [
    { type: 'SESSION_STARTED', at: T0, plannedMinutes: 25 },
    { type: 'SESSION_COMPLETED', at: T0, minutes: 25 },
  ]).flat();

describe('ASCII frames', () => {
  it('are 5–7 lines, at most 20 columns, 2–4 frames for every species and mood', () => {
    for (const species of SPECIES) {
      for (const mood of MOODS) {
        const frames = asciiFrames(species, mood);
        expect(frames.length).toBeGreaterThanOrEqual(2);
        expect(frames.length).toBeLessThanOrEqual(4);
        for (const frame of frames) {
          expect(frame.length).toBeGreaterThanOrEqual(5);
          expect(frame.length).toBeLessThanOrEqual(7);
          for (const line of frame) expect(line.length).toBeLessThanOrEqual(ASCII_MAX_WIDTH);
        }
      }
    }
  });

  it('gives each species a distinct look', () => {
    const looks = new Set(
      SPECIES.filter((s) => s !== 'unhatched').map((s) => asciiFrame(s, 'idle').join('\n')),
    );
    expect(looks.size).toBe(6);
    expect(asciiFrame('sprintail', 'idle').join('\n')).toContain('~~>');
    expect(asciiFrame('owlbyte', 'idle', 0).join('\n')).toContain('O   O');
    expect(asciiFrame('zenpaca', 'happy', -1)).toEqual(asciiFrame('zenpaca', 'happy', 1));
  });
});

describe('moods', () => {
  it('maps state to mood', () => {
    expect(moodFor(pet())).toBe('egg');
    const hatched = pet(sessions(3));
    expect(moodFor(hatched)).toBe('happy');
    expect(moodFor(reduce(hatched, { type: 'CI_PASSED', at: T0 }))).toBe('dance');
    const idle: PetState = {
      ...hatched,
      reactions: [],
      condition: 'content',
      lastEventAt: '2026-11-02T15:00:00.000Z',
    };
    expect(moodFor(idle)).toBe('idle');
    expect(moodFor(idle, '2026-11-02T23:30:00.000Z')).toBe('sleeping');
    const sad = reduce(
      { ...hatched, stats: { ...hatched.stats, mood: 10 } },
      { type: 'TICK', at: T0 },
    );
    expect(moodFor(sad)).toBe('sad');
    const sick = reduce(
      { ...hatched, stats: { ...hatched.stats, health: 20 } },
      { type: 'TICK', at: T0 },
    );
    expect(moodFor(sick)).toBe('sick');
    const asleep = reduce(hatched, { type: 'TICK', at: '2026-11-12T09:00:00.000Z' });
    expect(moodFor(asleep)).toBe('cocoon');
    for (const mood of MOODS) expect(faceFor(mood).length).toBeGreaterThan(2);
  });
});

describe('SVG pet', () => {
  it('renders valid SVG for every species and mood', () => {
    for (const species of SPECIES) {
      for (const mood of MOODS) {
        const doc = parse(renderPetSvg({ species, mood, idPrefix: `t-${species}-${mood}` }));
        expect(doc.documentElement.getAttribute('class')).toContain(`dl-mood-${mood}`);
      }
    }
  });

  it('respects reduced motion and can be static', () => {
    const svg = renderPetSvg({ species: 'sprout', mood: 'idle' });
    expect(svg).toContain('prefers-reduced-motion');
    expect(renderPetSvg({ species: 'sprout', mood: 'idle', animated: false })).not.toContain(
      'dl-species-sprout dl-animated',
    );
    expect(renderPetSvg({ species: 'sprout', mood: 'idle', title: '<x>' })).toContain('&lt;x&gt;');
  });
});

describe('README card', () => {
  it('is valid XML containing the name, species and stage', () => {
    const state = pet(sessions(3), 'Ada & <Bob>');
    const card = renderCard(state);
    const doc = parse(card);
    const text = doc.documentElement.textContent ?? '';
    expect(text).toContain('Ada & <Bob>');
    expect(text).toContain('sprout');
    expect(text).toContain('hatchling');
    expect(text).toContain('fed by focus');
    expect(card).toContain('prefers-color-scheme: dark');
    expect(card).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
  });

  it('shows the streak and condition', () => {
    const state = pet([...sessions(2)]);
    expect(renderCard(state, { nowIso: T0 })).toContain('1-day streak');
    expect(renderCard(pet())).toContain('0-day streak');
    expect(escapeXml(`"'`)).toBe('&quot;&apos;');
  });
});
