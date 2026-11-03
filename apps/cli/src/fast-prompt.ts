import { summarize } from '@daemonling/core';
import type { PetState } from '@daemonling/core';
import { faceFor } from '@daemonling/sprites';
import type { Mood } from '@daemonling/sprites';

/** Mood from the cached condition only (no time-zone math: ICU start-up alone costs ~15 ms). */
function quickMood(state: PetState): Mood {
  if (state.condition === 'hibernating') return 'cocoon';
  if (state.stage === 'egg') return 'egg';
  if (state.condition === 'sick') return 'sick';
  if (state.condition === 'sad') return 'sad';
  return state.condition === 'thriving' ? 'happy' : 'idle';
}

/**
 * The `dmn prompt` line: face, name and either the session clock or condition + streak. Reads the
 * cached snapshot as-is so shells can call it on every prompt in well under 50 ms.
 */
export function promptLineFor(state: PetState | null, nowIso: string): string {
  if (!state) return '';
  const s = summarize(state, nowIso);
  const face = faceFor(quickMood(state));
  if (s.sessionRemainingSeconds !== null) {
    return `${face} ${state.name} ${Math.ceil(s.sessionRemainingSeconds / 60)}m\n`;
  }
  const streak = s.streak > 0 ? ` ${s.streak}d` : '';
  return `${face} ${state.name} ${state.condition}${streak}\n`;
}
