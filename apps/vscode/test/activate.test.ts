import { afterAll, describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileStore } from '@daemonling/store/node';
import { calls, commands } from './vscode-stub.js';

const home = mkdtempSync(join(tmpdir(), 'dmn-vscode-'));
process.env.DAEMONLING_HOME = home;
const { activate, deactivate } = await import('../src/extension.js');

const subscriptions: Array<{ dispose: () => void }> = [];
const memento = new Map<string, unknown>();
const context = {
  subscriptions,
  globalState: {
    get: (k: string) => memento.get(k),
    update: async (k: string, v: unknown) => void memento.set(k, v),
  },
};
const store = new FileStore({ home });
const exec = (id: string, ...args: unknown[]) => commands.executeCommand(id, ...args);

afterAll(() => {
  for (const s of subscriptions) s.dispose();
  deactivate();
});

describe('extension activation (with a vscode stub)', () => {
  it('hatches, focuses, senses distraction, and opens the den', async () => {
    // @ts-expect-error the stub context only implements what activate() uses
    activate(context);
    expect(calls.commands.has('daemonling.menu')).toBe(true);

    await exec('daemonling.start'); // no pet yet → prompts to hatch
    expect(store.loadSync().state?.name).toBe('Vee');

    await exec('daemonling.start', 50);
    expect(store.loadSync().state?.activeSession?.plannedMinutes).toBe(50);

    // Away for 2 minutes during the session → a distraction is recorded on return.
    const t = Date.now();
    calls.windowListeners.forEach((cb) => cb({ focused: false }));
    const realNow = Date.now;
    Date.now = () => t + 120_000;
    calls.windowListeners.forEach((cb) => cb({ focused: true }));
    Date.now = realNow;
    expect(store.loadSync().events.some((e) => e.type === 'DISTRACTION_DETECTED')).toBe(true);

    await exec('daemonling.openDen');
    await exec('daemonling.openDen');
    expect(calls.panels[0]?.webview.html).toContain('<svg');
    calls.panels[0]?.webview.listeners.forEach((cb) => cb({ cmd: 'pet' }));

    await exec('daemonling.distracted');
    expect(store.loadSync().state?.activeSession).toBeNull();
    await exec('daemonling.break');
    await exec('daemonling.pet');
    calls.quickPick = { command: 'daemonling.pet' };
    await exec('daemonling.menu');
    expect(
      store.loadSync().events.filter((e) => e.type === 'PET_PETTED').length,
    ).toBeGreaterThanOrEqual(2);

    calls.config = { dailyGoalMinutes: 75, showInStatusBar: false };
    calls.configListeners.forEach((cb) => cb({ affectsConfiguration: () => true }));
    expect(store.loadSync().state?.settings.dailyGoalMinutes).toBe(75);
    await exec('daemonling.init'); // already has a pet: no-op
    expect(calls.warnings).toEqual([]);
  });
});
