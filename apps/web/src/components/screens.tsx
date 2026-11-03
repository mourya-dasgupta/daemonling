import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildHistory,
  buildWeeklyJournal,
  formatClock,
  localDay,
  mondayOf,
  weekdayName,
  weekStats,
} from '@daemonling/core';
import type { PetEvent, PetState } from '@daemonling/core';
import { renderPetSvg, SPECIES_LABEL } from '@daemonling/sprites';
import type { Mood } from '@daemonling/sprites';
import { denView, minutesDone, timerView, traitShares } from '../logic';

export interface ScreenProps {
  state: PetState;
  events: PetEvent[];
  now: number;
  onEvents: (...events: PetEvent[]) => Promise<unknown>;
}

/** The pet drawn as inline SVG (our own generated markup; the name is escaped by the renderer). */
export function PetSvg({
  species,
  name,
  mood,
  size = 200,
}: {
  species: PetState['species'];
  name: string;
  mood: Mood;
  size?: number;
}) {
  const svg = useMemo(
    () => renderPetSvg({ species, mood, size, idPrefix: `pet-${size}`, title: `${name}, ${mood}` }),
    [species, name, mood, size],
  );
  return <div className="pet-svg" data-mood={mood} dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="meter">
      <span className="meter-label">{label}</span>
      <div
        className="meter-track"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <div className="meter-fill" style={{ width: `${value}%` }} />
      </div>
      <span className="meter-value">{value}</span>
    </div>
  );
}

/** Den: the animated pet, its mood, what it says, its stats and quick actions. */
export function Den({ state, now, onEvents }: ScreenProps) {
  const nowIso = new Date(now).toISOString();
  const view = denView(state, nowIso);
  const reaction = state.reactions.at(-1)?.text;
  return (
    <section aria-labelledby="den-title" className="screen den">
      <PetSvg species={state.species} name={state.name} mood={view.mood} />
      <h2 id="den-title" className="pet-name">
        {state.name}
      </h2>
      <p className="subtle">
        {state.stage === 'egg' ? 'egg' : `${SPECIES_LABEL[state.species]} · ${state.stage}`} ·{' '}
        <span className={`chip chip-${state.condition}`}>{view.label}</span>
      </p>
      <p className="says">“{view.says}”</p>
      <p className="reaction" aria-live="polite">
        {reaction ?? ''}
      </p>
      <div className="meters">
        <Meter label="Satiety" value={view.stats.satiety} />
        <Meter label="Mood" value={view.stats.mood} />
        <Meter label="Health" value={view.stats.health} />
        <Meter label="Energy" value={view.stats.energy} />
        <Meter label="Bond" value={view.stats.bond} />
      </div>
      <div className="actions">
        <button
          type="button"
          onClick={() => void onEvents({ type: 'PET_PETTED', at: new Date(now).toISOString() })}
        >
          Pet {state.name}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() =>
            void onEvents({ type: 'BREAK_TAKEN', at: new Date(now).toISOString(), minutes: 10 })
          }
        >
          Log a 10-minute break
        </button>
      </div>
      {state.tricks.length > 0 && <p className="subtle">Tricks: {state.tricks.join(', ')}</p>}
    </section>
  );
}

const PRESETS = [25, 50, 90];

/** Focus: start a session, watch the countdown, stop honestly, or take a break. */
export function Focus({ state, now, onEvents }: ScreenProps) {
  const timer = timerView(state, now);
  const [minutes, setMinutes] = useState(25);
  const [task, setTask] = useState('');
  const completing = useRef(false);
  const iso = new Date(now).toISOString();

  useEffect(() => {
    if (timer.phase === 'done' && !completing.current) {
      completing.current = true;
      void onEvents({ type: 'SESSION_COMPLETED', at: iso, minutes: timer.plannedMinutes }).finally(
        () => {
          completing.current = false;
        },
      );
    }
  }, [timer.phase, timer.plannedMinutes, iso, onEvents]);

  if (timer.phase === 'idle') {
    return (
      <section aria-labelledby="focus-title" className="screen">
        <h2 id="focus-title">Focus</h2>
        <p className="subtle">Pick a length. {state.name} will keep you company.</p>
        <div className="presets" role="group" aria-label="Session length">
          {PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={minutes === m}
              className={minutes === m ? 'selected' : 'secondary'}
              onClick={() => setMinutes(m)}
            >
              {m} min
            </button>
          ))}
        </div>
        <label className="field">
          <span>What are you working on? (optional, stays on this device)</span>
          <input value={task} maxLength={120} onChange={(e) => setTask(e.target.value)} />
        </label>
        <div className="actions">
          <button
            type="button"
            onClick={() =>
              void onEvents({
                type: 'SESSION_STARTED',
                at: iso,
                plannedMinutes: minutes,
                ...(task.trim() ? { task: task.trim() } : {}),
              })
            }
          >
            Start {minutes}-minute session
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => void onEvents({ type: 'BREAK_TAKEN', at: iso, minutes: 10 })}
          >
            Log a 10-minute break
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="focus-title" className="screen focus-running">
      <h2 id="focus-title">Focusing{timer.task ? `: ${timer.task}` : ''}</h2>
      <div
        className="clock"
        role="timer"
        aria-live="off"
        aria-label={`${formatClock(timer.remainingSeconds)} left`}
      >
        {formatClock(timer.remainingSeconds)}
      </div>
      <div className="progress" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${Math.round(timer.progress * 100)}%` }} />
      </div>
      <p className="subtle">
        {state.name} is guarding the door. Stopping early? Being honest earns more XP than quitting
        silently.
      </p>
      <div className="actions">
        <button
          type="button"
          className="secondary"
          onClick={() =>
            void onEvents({
              type: 'DISTRACTION_REPORTED',
              at: iso,
              minutesDone: minutesDone(state, now),
            })
          }
        >
          I got distracted
        </button>
      </div>
    </section>
  );
}

/** Stats: this week's bars, streak and species progress, drawn with plain SVG. */
export function Stats({ state, events, now }: ScreenProps) {
  const nowIso = new Date(now).toISOString();
  const week = useMemo(() => {
    const history = buildHistory(events);
    return weekStats(history.days, mondayOf(localDay(nowIso, state.settings.timezone)));
  }, [events, nowIso, state.settings.timezone]);
  const goal = state.settings.dailyGoalMinutes;
  const max = Math.max(goal, ...week.days.map((d) => d.minutes), 1);
  const shares = traitShares(state);
  const chartH = 140;
  const barW = 28;
  const gap = 14;
  const goalY = chartH - (goal / max) * chartH;
  return (
    <section aria-labelledby="stats-title" className="screen">
      <h2 id="stats-title">This week</h2>
      <svg
        className="week-chart"
        viewBox={`0 0 ${7 * (barW + gap)} ${chartH + 24}`}
        role="img"
        aria-label={`Focus minutes per day this week: ${week.days.map((d) => `${weekdayName(d.day)} ${Math.round(d.minutes)}`).join(', ')}`}
      >
        <line x1="0" x2={7 * (barW + gap)} y1={goalY} y2={goalY} className="goal-line" />
        <text
          x={7 * (barW + gap) - 2}
          y={Math.max(12, goalY - 4)}
          textAnchor="end"
          className="bar-label"
        >
          goal {goal}m
        </text>
        {week.days.map((d, i) => {
          const h = (d.minutes / max) * chartH;
          return (
            <g key={d.day}>
              <rect
                x={i * (barW + gap) + gap / 2}
                y={chartH - h}
                width={barW}
                height={Math.max(h, 2)}
                rx="6"
                className={d.minutes >= goal ? 'bar met' : 'bar'}
              />
              <text
                x={i * (barW + gap) + gap / 2 + barW / 2}
                y={chartH + 18}
                textAnchor="middle"
                className="bar-label"
              >
                {weekdayName(d.day).slice(0, 2)}
              </text>
            </g>
          );
        })}
      </svg>
      <dl className="facts">
        <div>
          <dt>Sessions</dt>
          <dd>{week.sessions}</dd>
        </div>
        <div>
          <dt>Minutes</dt>
          <dd>{week.minutes}</dd>
        </div>
        <div>
          <dt>Breaks</dt>
          <dd>{week.breaks}</dd>
        </div>
        <div>
          <dt>Streak</dt>
          <dd>
            {state.streak.current} (best {state.streak.best})
          </dd>
        </div>
        <div>
          <dt>Freezes</dt>
          <dd>{state.streak.freezes}</dd>
        </div>
        <div>
          <dt>XP</dt>
          <dd>{Math.floor(state.xp)}</dd>
        </div>
      </dl>
      <h3>Species progress</h3>
      <p className="subtle">
        {state.stage === 'adult' || state.stage === 'elder'
          ? `${state.name} became a ${state.species}.`
          : `Your work style shapes what ${state.name} becomes at adulthood.`}
      </p>
      <ul className="traits">
        {shares.map((t) => (
          <li key={t.trait}>
            <span className="trait-name">{t.species}</span>
            <span className="subtle">({t.trait})</span>
            <div className="meter-track" aria-hidden="true">
              <div className="meter-fill" style={{ width: `${Math.round(t.share * 100)}%` }} />
            </div>
            <span className="meter-value">{Math.round(t.share * 100)}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Journal: the weekly letter from the pet and recent moments. */
export function Journal({ state, events, now }: ScreenProps) {
  const nowIso = new Date(now).toISOString();
  const weekStart = mondayOf(localDay(nowIso, state.settings.timezone));
  const lines = useMemo(
    () => buildWeeklyJournal([...events, { type: 'TICK', at: nowIso }], weekStart),
    [events, nowIso, weekStart],
  );
  return (
    <section aria-labelledby="journal-title" className="screen">
      <h2 id="journal-title">{state.name}'s journal</h2>
      <p className="subtle">Week of {weekStart}</p>
      <div className="letter">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <h3>Recent moments</h3>
      <ul className="moments">
        {[...state.journal]
          .reverse()
          .slice(0, 12)
          .map((entry) => (
            <li key={`${entry.at}-${entry.text}`}>
              <time dateTime={entry.at}>{entry.at.slice(0, 10)}</time> {entry.text}
            </li>
          ))}
      </ul>
    </section>
  );
}
