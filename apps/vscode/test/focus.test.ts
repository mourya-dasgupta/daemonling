import { describe, expect, it } from 'vitest';
import { initialFocusState, spendNotification, stepFocus } from '../src/focus.js';
import type { FocusInput, FocusState } from '../src/focus.js';

const cfg = { graceSeconds: 90, nudgeAfterSeconds: 300 };
const s = (n: number) => n * 1000;

function run(inputs: FocusInput[], start: FocusState = initialFocusState()) {
  let state = start;
  const effects = [];
  for (const input of inputs) {
    const step = stepFocus(state, input, cfg);
    state = step.state;
    effects.push(...step.effects);
  }
  return { state, effects };
}

describe('focus sensing', () => {
  it('ignores focus changes when no session is running', () => {
    const { state, effects } = run([
      { type: 'window', focused: false, at: 0 },
      { type: 'window', focused: true, at: s(600) },
    ]);
    expect(effects).toEqual([]);
    expect(state.awayCount).toBe(0);
  });

  it('forgives time away within the grace period', () => {
    const { effects, state } = run([
      { type: 'session', active: true, at: 0 },
      { type: 'window', focused: false, at: s(10) },
      { type: 'window', focused: true, at: s(100) },
    ]);
    expect(effects).toEqual([]);
    expect(state.awayCount).toBe(1);
  });

  it('reports a distraction after the grace period, on return', () => {
    const { effects, state } = run([
      { type: 'session', active: true, at: 0 },
      { type: 'window', focused: false, at: s(10) },
      { type: 'window', focused: true, at: s(111) },
    ]);
    expect(effects).toEqual([{ type: 'distraction-detected', secondsAway: 101 }]);
    expect(state.distractions).toBe(1);
  });

  it('offers to end honestly once after 5 minutes away', () => {
    const { effects } = run([
      { type: 'session', active: true, at: 0 },
      { type: 'window', focused: false, at: 0 },
      { type: 'tick', at: s(200) },
      { type: 'tick', at: s(301) },
      { type: 'tick', at: s(400) },
    ]);
    expect(effects).toEqual([{ type: 'offer-honest-end', minutesAway: 5 }]);
  });

  it('starts the away clock if a session begins while the window is unfocused', () => {
    const { effects } = run(
      [
        { type: 'session', active: true, at: 0 },
        { type: 'window', focused: true, at: s(95) },
      ],
      initialFocusState(false),
    );
    expect(effects).toEqual([{ type: 'distraction-detected', secondsAway: 95 }]);
  });

  it('resets when the session ends and ignores duplicate inputs', () => {
    const { state, effects } = run([
      { type: 'session', active: true, at: 0 },
      { type: 'session', active: true, at: 1 },
      { type: 'window', focused: false, at: s(1) },
      { type: 'window', focused: false, at: s(2) },
      { type: 'session', active: false, at: s(3) },
      { type: 'tick', at: s(1000) },
      { type: 'window', focused: true, at: s(1000) },
    ]);
    expect(effects).toEqual([]);
    expect(state.awaySince).toBeNull();
    expect(state.sessionActive).toBe(false);
  });
});

describe('notification budget', () => {
  it('allows at most two unsolicited notifications per day', () => {
    const first = spendNotification(undefined, '2026-11-02');
    expect(first).toEqual({ day: '2026-11-02', used: 1 });
    const second = spendNotification(first!, '2026-11-02');
    expect(second?.used).toBe(2);
    expect(spendNotification(second!, '2026-11-02')).toBeNull();
    expect(spendNotification(second!, '2026-11-03')).toEqual({ day: '2026-11-03', used: 1 });
  });
});
