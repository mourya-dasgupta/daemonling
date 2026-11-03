import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileStore } from '@daemonling/store/node';
import { makeColors } from '../src/color.js';
import type { Context } from '../src/context.js';
import { runCli } from '../src/program.js';

/** A test context with a controllable clock, scripted stdin and captured output. */
export interface Harness {
  ctx: Context;
  home: string;
  cwd: string;
  clock: { now: number };
  answers: string[];
  lines: string[];
  stdout: () => string;
  stderr: () => string;
  interrupt: () => void;
  run: (...argv: string[]) => Promise<{ code: number; out: string; err: string }>;
}

export function harness(start = '2026-11-02T09:00:00.000Z'): Harness {
  const home = mkdtempSync(join(tmpdir(), 'dmn-cli-'));
  const cwd = mkdtempSync(join(tmpdir(), 'dmn-cwd-'));
  const clock = { now: Date.parse(start) };
  let out = '';
  let err = '';
  const answers: string[] = [];
  const lines: string[] = [];
  let interruptHandler: (() => void) | null = null;
  const ctx: Context = {
    store: new FileStore({ home }),
    env: { DAEMONLING_HOME: home },
    cwd,
    now: () => new Date(clock.now).toISOString(),
    out: (t) => {
      out += t;
    },
    err: (t) => {
      err += t;
    },
    ask: async () => answers.shift() ?? '',
    readLines: async (_prompt, onLine) => {
      while (lines.length > 0) {
        if (!onLine(lines.shift()!)) break;
      }
    },
    onInterrupt: (handler) => {
      interruptHandler = handler;
      return () => {
        interruptHandler = null;
      };
    },
    interactive: false,
    colors: makeColors(false),
    // Fake time: sleeping advances the clock instantly.
    sleep: async (ms) => {
      clock.now += ms;
    },
  };
  const h: Harness = {
    ctx,
    home,
    cwd,
    clock,
    answers,
    lines,
    stdout: () => out,
    stderr: () => err,
    interrupt: () => interruptHandler?.(),
    run: async (...argv) => {
      const o = out.length;
      const e = err.length;
      const code = await runCli(argv, ctx);
      return { code, out: out.slice(o), err: err.slice(e) };
    },
  };
  return h;
}
