import { useCallback, useEffect, useRef, useState } from 'react';
import type { PetEvent, PetState } from '@daemonling/core';
import type { PetStore } from '@daemonling/store';

export interface PetData {
  events: PetEvent[];
  state: PetState | null;
}

/** Loads the pet from a store and exposes `dispatch` to append events. Syncs across tabs. */
export function usePet(store: PetStore) {
  const [data, setData] = useState<PetData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);

  const reload = useCallback(async () => {
    try {
      setData(await store.load());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [store]);

  useEffect(() => {
    void reload();
    if (typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel('daemonling');
    bc.onmessage = () => void reload();
    channel.current = bc;
    return () => bc.close();
  }, [reload]);

  const dispatch = useCallback(
    async (...events: PetEvent[]): Promise<PetState | null> => {
      try {
        const state = await store.append(events);
        await reload();
        channel.current?.postMessage('changed');
        return state;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return null;
      }
    },
    [store, reload],
  );

  const replace = useCallback(
    async (events: PetEvent[]): Promise<void> => {
      await store.replaceAll(events);
      await reload();
      channel.current?.postMessage('changed');
    },
    [store, reload],
  );

  return { data, error, dispatch, replace, reload, setError };
}

/** Current time in ms, updated every `intervalMs` (1 s by default). */
export function useNow(intervalMs = 1000, clock: () => number = Date.now): number {
  const [now, setNow] = useState(clock);
  useEffect(() => {
    const id = setInterval(() => setNow(clock()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, clock]);
  return now;
}
