import { useCallback, useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { reduce } from '@daemonling/core';
import type { PetEvent } from '@daemonling/core';
import { IndexedDbStore } from '@daemonling/store';
import type { PetStore } from '@daemonling/store';
import { Den, Focus, Journal, PetSvg, Stats } from './components/screens';
import { Settings } from './components/Settings';
import type { Theme } from './components/Settings';
import { usePet, useNow } from './usePet';

const TABS = ['Den', 'Focus', 'Stats', 'Journal', 'Settings'] as const;
type Tab = (typeof TABS)[number];

function readTheme(): Theme {
  try {
    const t = localStorage.getItem('daemonling-theme');
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system';
  }
}

export interface AppProps {
  store?: PetStore & { clear?: () => Promise<void> };
  /** Clock override for tests. */
  clock?: () => number;
  /** Id generator override for tests. */
  newId?: () => string;
}

/** The Daemonling web home. */
export function App({
  store: injected,
  clock = Date.now,
  newId = () => crypto.randomUUID(),
}: AppProps) {
  const store = useMemo(() => injected ?? new IndexedDbStore(), [injected]);
  const { data, error, dispatch, replace, reload } = usePet(store);
  const now = useNow(1000, clock);
  const [tab, setTab] = useState<Tab>('Den');
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('daemonling-theme', theme);
    } catch {
      // Storage may be unavailable (private mode); the theme still applies for this visit.
    }
  }, [theme]);

  const onEvents = useCallback((...events: PetEvent[]) => dispatch(...events), [dispatch]);

  if (error)
    return (
      <main className="app">
        <p role="alert">Something went wrong: {error}</p>
      </main>
    );
  if (!data)
    return (
      <main className="app">
        <p>Loading your den…</p>
      </main>
    );

  if (!data.state) {
    return (
      <main className="app">
        <Onboarding
          onHatch={(name) =>
            void onEvents({
              type: 'PET_CREATED',
              at: new Date(clock()).toISOString(),
              id: newId(),
              name,
              settings: { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
            })
          }
        />
      </main>
    );
  }

  // Show time passing (decay, hibernation) without writing an event every second.
  const state = reduce(data.state, { type: 'TICK', at: new Date(now).toISOString() });
  const props = { state, events: data.events, now, onEvents };

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    const next = TABS[(index + delta + TABS.length) % TABS.length]!;
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };

  return (
    <div className="app">
      <a className="skip" href="#panel">
        Skip to content
      </a>
      <header className="topbar">
        <h1 className="brand">daemonling</h1>
        <span className="subtle">
          {state.name} · {state.condition}
          {state.streak.current > 0 ? ` · streak ${state.streak.current}` : ''}
        </span>
      </header>
      <nav className="tabs" aria-label="Sections">
        <div className="tablist" role="tablist" aria-label="Sections">
          {TABS.map((t, i) => (
            <button
              key={t}
              id={`tab-${t}`}
              role="tab"
              type="button"
              aria-selected={tab === t}
              aria-controls="panel"
              tabIndex={tab === t ? 0 : -1}
              onClick={() => setTab(t)}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              {t}
            </button>
          ))}
        </div>
      </nav>
      <main id="panel">
        <div role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === 'Den' && <Den {...props} />}
          {tab === 'Focus' && <Focus {...props} />}
          {tab === 'Stats' && <Stats {...props} />}
          {tab === 'Journal' && <Journal {...props} />}
          {tab === 'Settings' && (
            <Settings
              {...props}
              theme={theme}
              onTheme={setTheme}
              onReplace={replace}
              onReset={async () => {
                await store.clear?.();
                await reload();
              }}
            />
          )}
        </div>
      </main>
      <footer className="footer subtle">
        Local-first: your pet lives only in this browser. No accounts, no tracking.
      </footer>
    </div>
  );
}

function Onboarding({ onHatch }: { onHatch: (name: string) => void }) {
  const [name, setName] = useState('Bit');
  return (
    <section className="screen onboarding" aria-labelledby="welcome">
      <PetSvg species="unhatched" name={name} mood="egg" />
      <h1 id="welcome">A tiny daemon that lives on your focus</h1>
      <p className="subtle">
        Focus sessions feed it, streaks teach it tricks, and weeks of work shape what it becomes. It
        never dies — if you drift away, it naps in a cocoon until you're back.
      </p>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          onHatch(name);
        }}
      >
        <label className="field">
          <span>Name your egg</span>
          <input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
        </label>
        <button type="submit">Hatch my daemon</button>
      </form>
    </section>
  );
}
