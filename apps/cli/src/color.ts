/** Minimal ANSI colour helpers (no dependency). Disabled entirely when colour is off. */
export interface Colors {
  enabled: boolean;
  bold: (s: string) => string;
  dim: (s: string) => string;
  red: (s: string) => string;
  green: (s: string) => string;
  yellow: (s: string) => string;
  blue: (s: string) => string;
  magenta: (s: string) => string;
  cyan: (s: string) => string;
}

function wrap(open: number, close: number, enabled: boolean): (s: string) => string {
  return enabled ? (s) => `\u001b[${open}m${s}\u001b[${close}m` : (s) => s;
}

/** Creates colour functions; when `enabled` is false they return text unchanged. */
export function makeColors(enabled: boolean): Colors {
  return {
    enabled,
    bold: wrap(1, 22, enabled),
    dim: wrap(2, 22, enabled),
    red: wrap(31, 39, enabled),
    green: wrap(32, 39, enabled),
    yellow: wrap(33, 39, enabled),
    blue: wrap(34, 39, enabled),
    magenta: wrap(35, 39, enabled),
    cyan: wrap(36, 39, enabled),
  };
}

/** Removes ANSI escape codes (for width calculations and tests). */
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');
}
