import { useState } from 'react';
import type { FormEvent } from 'react';
import { isValidTimezone } from '@daemonling/core';
import type { PetEvent } from '@daemonling/core';
import { makeExport, parseExport } from '@daemonling/store';
import { downloadText } from '../logic';
import type { ScreenProps } from './screens';

export type Theme = 'system' | 'light' | 'dark';

interface SettingsProps extends ScreenProps {
  theme: Theme;
  onTheme: (theme: Theme) => void;
  onReplace: (events: PetEvent[]) => Promise<void>;
  onReset: () => Promise<void>;
}

/** Settings: name, goal, bedtime, time zone, vacation, theme, export/import, start over. */
export function Settings({
  state,
  events,
  now,
  onEvents,
  theme,
  onTheme,
  onReplace,
  onReset,
}: SettingsProps) {
  const [name, setName] = useState(state.name);
  const [goal, setGoal] = useState(state.settings.dailyGoalMinutes);
  const [bedtime, setBedtime] = useState(state.settings.bedtimeHour);
  const [wake, setWake] = useState(state.settings.wakeHour);
  const [timezone, setTimezone] = useState(state.settings.timezone);
  const [message, setMessage] = useState('');
  const iso = new Date(now).toISOString();

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValidTimezone(timezone)) {
      setMessage(`"${timezone}" is not a time zone we know. Try something like Europe/Berlin.`);
      return;
    }
    await onEvents({
      type: 'SETTINGS_CHANGED',
      at: iso,
      name,
      settings: { dailyGoalMinutes: goal, bedtimeHour: bedtime, wakeHour: wake, timezone },
    });
    setMessage('Saved.');
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const imported = parseExport(await file.text());
      if (!window.confirm(`Replace ${state.name} with the imported pet?`)) return;
      await onReplace(imported);
      setMessage(`Imported ${imported.length} events.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Import failed.');
    }
  };

  return (
    <section aria-labelledby="settings-title" className="screen">
      <h2 id="settings-title">Settings</h2>
      <form onSubmit={(e) => void save(e)} className="form">
        <label className="field">
          <span>Name</span>
          <input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span>Daily goal (minutes)</span>
          <input
            type="number"
            min={10}
            max={480}
            value={goal}
            onChange={(e) => setGoal(Number(e.target.value))}
          />
        </label>
        <div className="row">
          <label className="field">
            <span>Bedtime (hour)</span>
            <input
              type="number"
              min={0}
              max={23}
              value={bedtime}
              onChange={(e) => setBedtime(Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>Wake (hour)</span>
            <input
              type="number"
              min={0}
              max={23}
              value={wake}
              onChange={(e) => setWake(Number(e.target.value))}
            />
          </label>
        </div>
        <label className="field">
          <span>Time zone</span>
          <input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
        </label>
        <button type="submit">Save settings</button>
      </form>
      <p role="status" className="subtle">
        {message}
      </p>

      <h3>Vacation</h3>
      <label className="toggle">
        <input
          type="checkbox"
          checked={state.vacation}
          onChange={(e) => void onEvents({ type: 'VACATION_SET', at: iso, on: e.target.checked })}
        />
        <span>Vacation mode — nothing decays and your streak is safe.</span>
      </label>

      <h3>Theme</h3>
      <div className="presets" role="group" aria-label="Theme">
        {(['system', 'light', 'dark'] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={theme === t}
            className={theme === t ? 'selected' : 'secondary'}
            onClick={() => onTheme(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <h3>Your data</h3>
      <p className="subtle">
        Everything lives in this browser. Export to move your pet to the CLI (`dmn import`) or
        another device.
      </p>
      <div className="actions">
        <button
          type="button"
          className="secondary"
          onClick={() =>
            downloadText(
              'daemonling-export.json',
              `${JSON.stringify(makeExport(events, iso), null, 2)}\n`,
            )
          }
        >
          Export JSON
        </button>
        <label className="button secondary">
          Import JSON
          <input
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            onChange={(e) => void importFile(e.target.files?.[0])}
          />
        </label>
        <button
          type="button"
          className="danger"
          onClick={() => {
            if (
              window.confirm(
                'Start over? This deletes your pet from this browser. Export first if you want a backup.',
              )
            )
              void onReset();
          }}
        >
          Start over
        </button>
      </div>
    </section>
  );
}
