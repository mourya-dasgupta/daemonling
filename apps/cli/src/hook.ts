import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

export const HOOK_START = '# >>> daemonling >>>';
export const HOOK_END = '# <<< daemonling <<<';

/** The block added to `.git/hooks/post-commit`. It never fails the commit. */
export const HOOK_BLOCK = [
  HOOK_START,
  '# Feeds your Daemonling a commit treat (only counts during a focus session).',
  'command -v dmn >/dev/null 2>&1 && dmn event commit --sha "$(git rev-parse HEAD 2>/dev/null)" >/dev/null 2>&1 || true',
  HOOK_END,
].join('\n');

/** Absolute path of the repository's `post-commit` hook. Throws if `cwd` is not a git repo. */
export function hookPath(cwd: string): string {
  let hooksDir: string;
  try {
    hooksDir = execFileSync('git', ['rev-parse', '--git-path', 'hooks'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    throw new Error('This folder is not inside a git repository.');
  }
  return join(isAbsolute(hooksDir) ? hooksDir : join(cwd, hooksDir), 'post-commit');
}

/** Adds the Daemonling block to a hook script's text (idempotent). */
export function addBlock(existing: string | null): string {
  if (existing?.includes(HOOK_START)) return existing;
  if (!existing || existing.trim() === '') return `#!/bin/sh\n${HOOK_BLOCK}\n`;
  return `${existing.replace(/\n*$/, '\n')}\n${HOOK_BLOCK}\n`;
}

/** Removes the Daemonling block; returns null when nothing meaningful remains. */
export function removeBlock(existing: string): string | null {
  const pattern = new RegExp(`\\n?${escape(HOOK_START)}[\\s\\S]*?${escape(HOOK_END)}\\n?`, 'g');
  const rest = existing.replace(pattern, '\n').replace(/\n{3,}/g, '\n\n');
  const meaningful = rest
    .split('\n')
    .filter((l) => l.trim() !== '' && !l.startsWith('#!'))
    .join('');
  return meaningful === '' ? null : `${rest.trim()}\n`;
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Installs the post-commit hook; returns its path. */
export function installHook(cwd: string): string {
  const path = hookPath(cwd);
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : null;
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, addBlock(existing));
  chmodSync(path, 0o755);
  return path;
}

/** Removes the hook block (deleting the file if it only contained ours). Returns whether it changed. */
export function uninstallHook(cwd: string): boolean {
  const path = hookPath(cwd);
  if (!existsSync(path)) return false;
  const existing = readFileSync(path, 'utf8');
  if (!existing.includes(HOOK_START)) return false;
  const rest = removeBlock(existing);
  if (rest === null) rmSync(path);
  else writeFileSync(path, rest);
  return true;
}
