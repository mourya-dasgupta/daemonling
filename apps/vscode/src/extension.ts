/**
 * VS Code extension entry point. Thin glue around pure modules: `focus.ts` (focus sensing) and
 * `view.ts` (status bar, menu, den HTML). Shares `~/.daemonling` with the `dmn` CLI.
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { statSync } from 'node:fs';
import * as vscode from 'vscode';
import { localDay, reduce } from '@daemonling/core';
import type { PetEvent, PetState } from '@daemonling/core';
import { FileStore, defaultHome } from '@daemonling/store/node';
import { DEFAULT_FOCUS_CONFIG, initialFocusState, spendNotification, stepFocus } from './focus.js';
import type { FocusEffect, FocusInput, FocusState, NotificationBudget } from './focus.js';
import { denHtml, menuItems, statusBarView } from './view.js';

const BUDGET_KEY = 'daemonling.notificationBudget';

export function activate(context: vscode.ExtensionContext): void {
  const store = new FileStore({ home: defaultHome() });
  let state: PetState | null = null;
  let logStamp = '';
  let focus: FocusState = initialFocusState(vscode.window.state.focused);
  let den: vscode.WebviewPanel | undefined;

  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  item.command = 'daemonling.menu';
  context.subscriptions.push(item);

  const config = () => vscode.workspace.getConfiguration('daemonling');
  const now = () => new Date().toISOString();

  /** Reloads the pet when the log changed on disk (the CLI may have written to it). */
  const reload = (force = false): void => {
    let stamp = 'missing';
    try {
      const st = statSync(store.eventsPath);
      stamp = `${st.size}:${st.mtimeMs}`;
    } catch {
      // No pet yet.
    }
    if (!force && stamp === logStamp) return;
    logStamp = stamp;
    try {
      state = store.loadSync().state;
    } catch {
      state = null;
    }
  };

  const append = (...events: PetEvent[]): PetState | null => {
    try {
      state = store.appendSync(events);
      reload(true);
      return state;
    } catch (error) {
      void vscode.window.showWarningMessage(
        `Daemonling: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  };

  const feedFocus = (input: FocusInput): void => {
    const step = stepFocus(focus, input, {
      ...DEFAULT_FOCUS_CONFIG,
      graceSeconds: config().get<number>('graceSeconds', 90),
    });
    focus = step.state;
    for (const effect of step.effects) void handleEffect(effect);
  };

  const notify = (): boolean => {
    const today = localDay(now(), state?.settings.timezone ?? 'UTC');
    const next = spendNotification(context.globalState.get<NotificationBudget>(BUDGET_KEY), today);
    if (!next) return false;
    void context.globalState.update(BUDGET_KEY, next);
    return true;
  };

  const handleEffect = async (effect: FocusEffect): Promise<void> => {
    if (effect.type === 'distraction-detected') {
      append({ type: 'DISTRACTION_DETECTED', at: now(), secondsAway: effect.secondsAway });
      return;
    }
    if (!notify()) return;
    const choice = await vscode.window.showInformationMessage(
      `You've been away ${effect.minutesAway} minutes. End the session honestly? (Honest = more XP.)`,
      'End honestly',
      'Keep going',
    );
    if (choice === 'End honestly') await vscode.commands.executeCommand('daemonling.distracted');
  };

  const render = (): void => {
    reload();
    const nowIso = now();
    if (state?.activeSession) {
      const end =
        Date.parse(state.activeSession.startedAt) + state.activeSession.plannedMinutes * 60_000;
      if (Date.now() >= end) {
        append({
          type: 'SESSION_COMPLETED',
          at: nowIso,
          minutes: state.activeSession.plannedMinutes,
        });
        void vscode.window.showInformationMessage(
          `Session complete! ${state?.name ?? 'Your daemon'} is happily munching.`,
        );
      }
    }
    feedFocus({ type: 'session', active: Boolean(state?.activeSession), at: Date.now() });
    feedFocus({ type: 'tick', at: Date.now() });
    const display = state ? reduce(state, { type: 'TICK', at: nowIso }) : null;
    const view = statusBarView(display, nowIso);
    item.text = view.text;
    item.tooltip = view.tooltip;
    if (config().get<boolean>('showInStatusBar', true)) item.show();
    else item.hide();
    if (den)
      den.webview.html = denHtml(
        display,
        nowIso,
        randomBytes(16).toString('hex'),
        den.webview.cspSource,
      );
  };

  const requirePet = (): PetState | null => {
    reload(true);
    if (!state) void vscode.commands.executeCommand('daemonling.init');
    return state;
  };

  const register = (id: string, fn: (...args: unknown[]) => unknown): void => {
    context.subscriptions.push(
      vscode.commands.registerCommand(id, async (...args: unknown[]) => {
        await fn(...args);
        render();
      }),
    );
  };

  register('daemonling.menu', async () => {
    reload(true);
    const picked = await vscode.window.showQuickPick(menuItems(state), {
      placeHolder: state ? `${state.name} is ${state.condition}` : 'Daemonling',
    });
    if (picked) await vscode.commands.executeCommand(picked.command, ...(picked.args ?? []));
  });

  register('daemonling.init', async () => {
    reload(true);
    if (state) return;
    const name = await vscode.window.showInputBox({ prompt: 'Name your daemon', value: 'Bit' });
    if (name === undefined) return;
    append({
      type: 'PET_CREATED',
      at: now(),
      id: randomUUID(),
      name,
      settings: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dailyGoalMinutes: config().get<number>('dailyGoalMinutes', 50),
        graceSeconds: config().get<number>('graceSeconds', 90),
      },
    });
  });

  register('daemonling.start', (minutes: unknown) => {
    const pet = requirePet();
    if (!pet || pet.activeSession) return;
    const planned = typeof minutes === 'number' ? minutes : 25;
    append({ type: 'SESSION_STARTED', at: now(), plannedMinutes: planned });
  });
  register('daemonling.distracted', () => {
    const pet = requirePet();
    if (!pet?.activeSession) return;
    const minutesDone = Math.floor((Date.now() - Date.parse(pet.activeSession.startedAt)) / 60_000);
    const next = append({ type: 'DISTRACTION_REPORTED', at: now(), minutesDone });
    if (next)
      void vscode.window.showInformationMessage(
        next.reactions[0]?.text ?? 'Thanks for being honest.',
      );
  });
  register('daemonling.break', () => {
    if (requirePet()) append({ type: 'BREAK_TAKEN', at: now(), minutes: 10 });
  });
  register('daemonling.pet', () => {
    if (requirePet()) append({ type: 'PET_PETTED', at: now() });
  });
  register('daemonling.openDen', () => {
    if (den) {
      den.reveal();
      return;
    }
    den = vscode.window.createWebviewPanel(
      'daemonlingDen',
      'Daemonling Den',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [],
      },
    );
    den.onDidDispose(() => {
      den = undefined;
    });
    den.webview.onDidReceiveMessage((message: { cmd?: string }) => {
      const map: Record<string, string> = {
        pet: 'daemonling.pet',
        start: 'daemonling.start',
        break: 'daemonling.break',
        distracted: 'daemonling.distracted',
      };
      const command = message.cmd ? map[message.cmd] : undefined;
      if (command) void vscode.commands.executeCommand(command);
    });
  });

  context.subscriptions.push(
    vscode.window.onDidChangeWindowState((e) => {
      feedFocus({ type: 'window', focused: e.focused, at: Date.now() });
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration('daemonling')) return;
      reload(true);
      if (state) {
        const goal = config().get<number>('dailyGoalMinutes', 50);
        const grace = config().get<number>('graceSeconds', 90);
        if (goal !== state.settings.dailyGoalMinutes || grace !== state.settings.graceSeconds) {
          append({
            type: 'SETTINGS_CHANGED',
            at: now(),
            settings: { dailyGoalMinutes: goal, graceSeconds: grace },
          });
        }
      }
      render();
    }),
  );

  const timer = setInterval(render, 1000);
  context.subscriptions.push({ dispose: () => clearInterval(timer) });
  render();
}

/** Called when the extension is deactivated. */
export function deactivate(): void {}
