import { createInterface } from 'node:readline/promises';
import { FileStore, defaultHome } from '@daemonling/store/node';
import { makeColors } from './color.js';
import type { Colors } from './color.js';

/** Everything a command needs from the outside world, injectable for tests. */
export interface Context {
  store: FileStore;
  env: NodeJS.ProcessEnv;
  cwd: string;
  /** Current time as ISO; the only clock the CLI uses. */
  now: () => string;
  out: (text: string) => void;
  err: (text: string) => void;
  /** Asks a question on stdin and resolves with the answer (empty string on EOF). */
  ask: (question: string) => Promise<string>;
  /** Reads lines until EOF or until `onLine` returns false. */
  readLines: (prompt: string, onLine: (line: string) => boolean) => Promise<void>;
  /** Registers a Ctrl+C handler; returns an unsubscribe function. */
  onInterrupt: (handler: () => void) => () => void;
  /** Whether stdout is an interactive terminal (enables the live countdown). */
  interactive: boolean;
  colors: Colors;
  /** Waits (real timers in production, can be instant in tests). */
  sleep: (ms: number) => Promise<void>;
}

/** Builds the production context bound to the real process. */
export function processContext(): Context {
  const env = process.env;
  const interactive = Boolean(process.stdout.isTTY);
  const ask = async (question: string): Promise<string> => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      return await rl.question(question);
    } catch {
      return '';
    } finally {
      rl.close();
    }
  };
  return {
    store: new FileStore({ home: defaultHome(env) }),
    env,
    cwd: process.cwd(),
    now: () => new Date().toISOString(),
    out: (text) => process.stdout.write(text),
    err: (text) => process.stderr.write(text),
    ask,
    readLines: async (prompt, onLine) => {
      const rl = createInterface({ input: process.stdin, output: process.stdout, prompt });
      rl.prompt();
      for await (const line of rl) {
        if (!onLine(line)) break;
        rl.prompt();
      }
      rl.close();
    },
    onInterrupt: (handler) => {
      process.on('SIGINT', handler);
      return () => process.off('SIGINT', handler);
    },
    interactive,
    colors: makeColors(colorEnabled(env, interactive)),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
}

/** Colour is on for terminals unless `NO_COLOR` is set; `FORCE_COLOR` turns it on anywhere. */
export function colorEnabled(env: NodeJS.ProcessEnv, isTTY: boolean): boolean {
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== '') return false;
  if (env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== '0') return true;
  return isTTY;
}
