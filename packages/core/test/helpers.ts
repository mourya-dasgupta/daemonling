import { createPet, reduce } from '../src/index.js';
import type { PetEvent, PetState, Settings } from '../src/index.js';

/** Monday 2 Nov 2026, 09:00 UTC. */
export const T0 = '2026-11-02T09:00:00.000Z';

/** ISO timestamp `minutes` after `base`. */
export function plus(base: string, minutes: number): string {
  return new Date(Date.parse(base) + minutes * 60_000).toISOString();
}

/** A fresh egg in UTC with the default 07:00–23:00 day. */
export function newPet(settings: Partial<Settings> = {}, at = T0): PetState {
  return createPet({
    type: 'PET_CREATED',
    at,
    id: 'pet-1',
    name: 'Bit',
    settings: { timezone: 'UTC', ...settings },
  });
}

/** Applies events in order. */
export function run(state: PetState, ...events: PetEvent[]): PetState {
  return events.reduce(reduce, state);
}

/** A started-and-completed session ending at `start + minutes`. */
export function session(start: string, minutes: number, task?: string): PetEvent[] {
  return [
    { type: 'SESSION_STARTED', at: start, plannedMinutes: minutes, ...(task ? { task } : {}) },
    { type: 'SESSION_COMPLETED', at: plus(start, minutes), minutes },
  ];
}

/** Applies a completed session. */
export function focus(state: PetState, start: string, minutes: number): PetState {
  return run(state, ...session(start, minutes));
}

/** Returns a copy of the state with some stats overridden (for focused rule tests). */
export function withStats(state: PetState, stats: Partial<PetState['stats']>): PetState {
  return { ...state, stats: { ...state.stats, ...stats } };
}
