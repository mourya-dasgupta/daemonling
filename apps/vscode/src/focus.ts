/**
 * Focus sensing as a pure state machine. The extension feeds it window focus changes, session
 * start/stop and periodic ticks; it returns effects to perform. It only ever sees timestamps and
 * booleans — never documents, file names or keystrokes.
 */

export interface FocusConfig {
  /** Time away that is forgiven, in seconds (the `daemonling.graceSeconds` setting). */
  graceSeconds: number;
  /** After this long away, offer (once) to end the session honestly. Default 300 s. */
  nudgeAfterSeconds: number;
}

export const DEFAULT_FOCUS_CONFIG: FocusConfig = { graceSeconds: 90, nudgeAfterSeconds: 300 };

export interface FocusState {
  sessionActive: boolean;
  windowFocused: boolean;
  /** Epoch ms when the window lost focus during a session, or null. */
  awaySince: number | null;
  /** Whether the "end honestly?" nudge was already shown for this away period. */
  nudged: boolean;
  /** Counters for this session (shown to the user; never sent anywhere). */
  awayCount: number;
  distractions: number;
}

export type FocusInput =
  | { type: 'session'; active: boolean; at: number }
  | { type: 'window'; focused: boolean; at: number }
  | { type: 'tick'; at: number };

export type FocusEffect =
  | { type: 'distraction-detected'; secondsAway: number }
  | { type: 'offer-honest-end'; minutesAway: number };

export interface FocusStep {
  state: FocusState;
  effects: FocusEffect[];
}

/** Initial state: no session, window focused. */
export function initialFocusState(windowFocused = true): FocusState {
  return {
    sessionActive: false,
    windowFocused,
    awaySince: null,
    nudged: false,
    awayCount: 0,
    distractions: 0,
  };
}

/** Advances the focus machine by one input. Pure. */
export function stepFocus(
  state: FocusState,
  input: FocusInput,
  config: FocusConfig = DEFAULT_FOCUS_CONFIG,
): FocusStep {
  switch (input.type) {
    case 'session': {
      if (input.active === state.sessionActive) return { state, effects: [] };
      return {
        state: {
          ...state,
          sessionActive: input.active,
          awaySince: input.active && !state.windowFocused ? input.at : null,
          nudged: false,
          awayCount: input.active ? 0 : state.awayCount,
          distractions: input.active ? 0 : state.distractions,
        },
        effects: [],
      };
    }
    case 'window': {
      if (input.focused === state.windowFocused) return { state, effects: [] };
      if (!input.focused) {
        const away = state.sessionActive;
        return {
          state: {
            ...state,
            windowFocused: false,
            awaySince: away ? input.at : null,
            nudged: false,
            awayCount: state.awayCount + (away ? 1 : 0),
          },
          effects: [],
        };
      }
      const effects: FocusEffect[] = [];
      let distractions = state.distractions;
      if (state.sessionActive && state.awaySince !== null) {
        const secondsAway = Math.round((input.at - state.awaySince) / 1000);
        if (secondsAway > config.graceSeconds) {
          effects.push({ type: 'distraction-detected', secondsAway });
          distractions += 1;
        }
      }
      return {
        state: { ...state, windowFocused: true, awaySince: null, nudged: false, distractions },
        effects,
      };
    }
    case 'tick': {
      if (!state.sessionActive || state.awaySince === null || state.nudged) {
        return { state, effects: [] };
      }
      const secondsAway = (input.at - state.awaySince) / 1000;
      if (secondsAway <= config.nudgeAfterSeconds) return { state, effects: [] };
      return {
        state: { ...state, nudged: true },
        effects: [{ type: 'offer-honest-end', minutesAway: Math.floor(secondsAway / 60) }],
      };
    }
  }
}

/** Notification budget: at most `max` unsolicited notifications per local day. */
export interface NotificationBudget {
  day: string;
  used: number;
}

/** Returns the updated budget if a notification may be shown, or null if the budget is spent. */
export function spendNotification(
  budget: NotificationBudget | undefined,
  today: string,
  max = 2,
): NotificationBudget | null {
  const current = budget && budget.day === today ? budget : { day: today, used: 0 };
  if (current.used >= max) return null;
  return { day: today, used: current.used + 1 };
}
