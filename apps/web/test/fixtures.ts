import { createPet, reduce } from '@daemonling/core';
import type { PetEvent, PetState } from '@daemonling/core';

export const T0 = '2026-11-02T09:00:00.000Z';
export const T0_MS = Date.parse(T0);

export function pet(...events: PetEvent[]): PetState {
  return events.reduce(
    reduce,
    createPet({ type: 'PET_CREATED', at: T0, id: 'p', name: 'Bit', settings: { timezone: 'UTC' } }),
  );
}

export const hatched = (): PetState =>
  pet(
    ...Array.from({ length: 3 }, (): PetEvent[] => [
      { type: 'SESSION_STARTED', at: T0, plannedMinutes: 25 },
      { type: 'SESSION_COMPLETED', at: T0, minutes: 25 },
    ]).flat(),
  );
