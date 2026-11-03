import { formatClock, summarize } from '@daemonling/core';
import type { PetState } from '@daemonling/core';
import { escapeXml, faceFor, moodFor, renderPetSvg, SPECIES_LABEL } from '@daemonling/sprites';

/** Text and tooltip for the status bar item. */
export interface StatusBarView {
  text: string;
  tooltip: string;
}

/** What the status bar shows: face, name/condition, and time left in a session. */
export function statusBarView(state: PetState | null, nowIso: string): StatusBarView {
  if (!state) {
    return {
      text: '$(sparkle) Daemonling',
      tooltip: 'No daemon yet — click to hatch one (or run `dmn init`).',
    };
  }
  const s = summarize(state, nowIso);
  const face = faceFor(moodFor(state, nowIso));
  const right =
    s.sessionRemainingSeconds !== null
      ? `${formatClock(s.sessionRemainingSeconds)}`
      : s.streak > 0
        ? `${state.condition} · ${s.streak}d`
        : state.condition;
  return {
    text: `${face} ${right}`,
    tooltip: `${state.name} the ${SPECIES_LABEL[state.species]} (${state.stage}) — ${state.condition}\n"${s.says}"\nClick for actions.`,
  };
}

/** Quick-pick actions offered from the status bar. */
export interface MenuItem {
  label: string;
  description?: string;
  command: string;
  args?: unknown[];
}

/** Menu entries, depending on whether a session is running. */
export function menuItems(state: PetState | null): MenuItem[] {
  if (!state) return [{ label: '$(add) Hatch a daemon', command: 'daemonling.init' }];
  const items: MenuItem[] = [];
  if (state.activeSession) {
    items.push({
      label: '$(eye-closed) I got distracted',
      description: 'end honestly — more XP than quitting',
      command: 'daemonling.distracted',
    });
  } else {
    for (const minutes of [25, 50, 90]) {
      items.push({
        label: `$(play) Start ${minutes} minutes`,
        command: 'daemonling.start',
        args: [minutes],
      });
    }
  }
  items.push(
    { label: '$(coffee) Take a break', description: '10 minutes', command: 'daemonling.break' },
    { label: '$(heart) Pet', command: 'daemonling.pet' },
    { label: '$(info) Show status', command: 'daemonling.openDen' },
  );
  return items;
}

function statRow(label: string, value: number): string {
  const v = Math.round(value);
  return (
    `<div class="stat"><span>${label}</span>` +
    `<div class="track" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v}">` +
    `<div class="fill" style="width:${v}%"></div></div><span class="num">${v}</span></div>`
  );
}

/** Full HTML for the "Open Den" webview. Scripts are limited by a strict CSP with a nonce. */
export function denHtml(
  state: PetState | null,
  nowIso: string,
  nonce: string,
  cspSource: string,
): string {
  const csp = `default-src 'none'; img-src ${cspSource} data:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';`;
  let body: string;
  if (!state) {
    body = '<p>No daemon yet. Run <code>dmn init</code> in a terminal or use the status bar.</p>';
  } else {
    const s = summarize(state, nowIso);
    const mood = moodFor(state, nowIso);
    const session =
      s.sessionRemainingSeconds !== null
        ? `<p class="session">Focusing: <strong>${formatClock(s.sessionRemainingSeconds)}</strong> left</p>`
        : '';
    body =
      `<div class="pet">${renderPetSvg({ species: state.species, mood, size: 180, idPrefix: 'den' })}</div>` +
      `<h1>${escapeXml(state.name)}</h1>` +
      `<p class="sub">${SPECIES_LABEL[state.species]} · ${state.stage} · ${state.condition} · ${s.xp} xp</p>` +
      `<p class="says">"${escapeXml(s.says)}"</p>${session}` +
      `<div class="stats">${statRow('Satiety', s.stats.satiety)}${statRow('Mood', s.stats.mood)}${statRow('Health', s.stats.health)}${statRow('Energy', s.stats.energy)}${statRow('Bond', s.stats.bond)}</div>` +
      `<p class="sub">Streak ${s.streak} (best ${s.bestStreak}) · ${s.freezes} freeze(s) · tricks: ${s.tricks.join(', ') || 'none yet'}</p>` +
      `<div class="actions"><button data-cmd="pet">Pet</button>` +
      (state.activeSession
        ? '<button data-cmd="distracted">I got distracted</button>'
        : '<button data-cmd="start">Start 25 minutes</button>') +
      `<button data-cmd="break">Take a break</button></div>`;
  }
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Daemonling Den</title>
<style>
body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background);padding:24px;max-width:520px;margin:auto;text-align:center}
.pet{display:flex;justify-content:center}h1{margin:.2em 0}.sub{opacity:.8}.says{font-style:italic}
.stats{text-align:left;margin:16px 0}.stat{display:grid;grid-template-columns:70px 1fr 32px;gap:8px;align-items:center;margin:6px 0}
.track{height:10px;border-radius:5px;background:var(--vscode-editorWidget-background,#8884)}.fill{height:100%;border-radius:5px;background:var(--vscode-charts-orange,#e0793f)}
.num{text-align:right}.actions{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
button{font:inherit;padding:6px 14px;border:0;border-radius:4px;color:var(--vscode-button-foreground);background:var(--vscode-button-background);cursor:pointer}
button:hover{background:var(--vscode-button-hoverBackground)}button:focus-visible{outline:2px solid var(--vscode-focusBorder);outline-offset:2px}
</style></head><body>${body}
<script nonce="${nonce}">const vscode=acquireVsCodeApi();document.querySelectorAll('button[data-cmd]').forEach(b=>b.addEventListener('click',()=>vscode.postMessage({cmd:b.dataset.cmd})));</script>
</body></html>`;
}
