import type { PetEvent } from '@daemonling/core';

export const T0 = '2026-11-02T09:00:00.000Z';
export const EVENTS: PetEvent[] = [
  { type: 'PET_CREATED', at: T0, id: 'p1', name: 'Bit', settings: { timezone: 'UTC' } },
  { type: 'SESSION_STARTED', at: T0, plannedMinutes: 25 },
  { type: 'SESSION_COMPLETED', at: '2026-11-02T09:25:00.000Z', minutes: 25 },
];
