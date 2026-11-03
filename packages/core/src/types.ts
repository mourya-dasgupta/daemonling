/** Life stage, in order of growth. */
export type Stage = 'egg' | 'hatchling' | 'juvenile' | 'adult' | 'elder';

/** Derived wellbeing, recomputed after every event. */
export type Condition = 'thriving' | 'content' | 'sad' | 'sick' | 'hibernating';

/** Evolved species are decided by the dominant work trait when the pet becomes an adult. */
export type EvolvedSpecies = 'owlbyte' | 'sprintail' | 'zenpaca' | 'shipwyrm' | 'nocturne';

/** `unhatched` for eggs, `sprout` before adulthood, then an evolved species. */
export type Species = 'unhatched' | 'sprout' | EvolvedSpecies;

/** Work-style traits that steer evolution. */
export type TraitName = 'depth' | 'sprint' | 'balance' | 'craft' | 'night';

/** Core stats, all clamped to 0..100. */
export interface Stats {
  satiety: number;
  mood: number;
  health: number;
  energy: number;
  bond: number;
}

/** User preferences that shape the simulation. */
export interface Settings {
  dailyGoalMinutes: number;
  /** Local hour (0–23) the pet goes to sleep. */
  bedtimeHour: number;
  /** Local hour (0–23) the pet wakes up. */
  wakeHour: number;
  /** Seconds away from the editor that are forgiven during a session. */
  graceSeconds: number;
  /** IANA time zone used for calendar days and awake hours. */
  timezone: string;
}

export interface Streak {
  current: number;
  best: number;
  freezes: number;
  /** Last local calendar day (YYYY-MM-DD) that met the daily goal. */
  lastCountedDay: string | null;
}

export interface ActiveSession {
  startedAt: string;
  plannedMinutes: number;
  task?: string;
}

export type JournalKind =
  | 'born'
  | 'hatched'
  | 'stage'
  | 'evolved'
  | 'trick'
  | 'streak'
  | 'freeze'
  | 'hibernate'
  | 'welcome-back'
  | 'overwork'
  | 'note';

export interface JournalEntry {
  at: string;
  kind: JournalKind;
  text: string;
}

/** A short-lived reaction to the latest event, for UIs to animate. Cleared by the next event. */
export type ReactionKind =
  | 'happy'
  | 'yawn'
  | 'victory-dance'
  | 'welcome-back'
  | 'learned-trick'
  | 'evolved'
  | 'hatched'
  | 'purr'
  | 'sulk';

export interface Reaction {
  kind: ReactionKind;
  text: string;
}

/**
 * Bookkeeping the rules need but that is not part of the pet's public face. Kept in the state so
 * the reducer stays a pure function of (state, event).
 */
export interface Ledger {
  /** Local day the `day*` counters belong to. */
  day: string;
  dayFocusMinutes: number;
  dayCommitsCounted: number;
  dayBondFromPetting: number;
  /** Mood already lost to detected distractions in the active session (negative or 0). */
  sessionDistractionPenalty: number;
  /** Last local day whose streak outcome has been settled. */
  streakCheckedThrough: string;
  /** When satiety last dropped below the hunger threshold, or null if not hungry. */
  hungrySince: string | null;
  hungerPenaltiesApplied: number;
  /** The 7-day hibernation clock runs from here (last completed session or vacation end). */
  careClockAt: string;
  hibernating: boolean;
  /** Completed-session timestamps since hibernation started (wake-up progress). */
  wakeSessions: string[];
  sessionsCompleted: number;
  totalFocusMinutes: number;
  lastSessionCompletedAt: string | null;
  /** True once CI_PASSED has been seen: UIs may play the victory dance. */
  victoryDanceUnlocked: boolean;
}

export interface PetState {
  schemaVersion: number;
  id: string;
  name: string;
  bornAt: string;
  stage: Stage;
  species: Species;
  condition: Condition;
  stats: Stats;
  xp: number;
  traits: Record<TraitName, number>;
  streak: Streak;
  tricks: string[];
  settings: Settings;
  activeSession: ActiveSession | null;
  vacation: boolean;
  lastEventAt: string;
  focusMinutesSinceBreak: number;
  journal: JournalEntry[];
  reactions: Reaction[];
  ledger: Ledger;
}

interface Timestamped {
  /** ISO-8601 timestamp. The only source of time for the reducer. */
  at: string;
}

export interface PetCreatedEvent extends Timestamped {
  type: 'PET_CREATED';
  id: string;
  name: string;
  settings?: Partial<Settings>;
}
export interface SessionStartedEvent extends Timestamped {
  type: 'SESSION_STARTED';
  plannedMinutes: number;
  task?: string;
}
export interface SessionCompletedEvent extends Timestamped {
  type: 'SESSION_COMPLETED';
  minutes: number;
}
export interface SessionAbandonedEvent extends Timestamped {
  type: 'SESSION_ABANDONED';
  minutesDone: number;
}
export interface DistractionReportedEvent extends Timestamped {
  type: 'DISTRACTION_REPORTED';
  minutesDone: number;
}
export interface DistractionDetectedEvent extends Timestamped {
  type: 'DISTRACTION_DETECTED';
  secondsAway: number;
}
export interface BreakTakenEvent extends Timestamped {
  type: 'BREAK_TAKEN';
  minutes: number;
}
export interface CommitMadeEvent extends Timestamped {
  type: 'COMMIT_MADE';
  sha?: string;
}
export interface CiPassedEvent extends Timestamped {
  type: 'CI_PASSED';
}
export interface PetPettedEvent extends Timestamped {
  type: 'PET_PETTED';
}
export interface VacationSetEvent extends Timestamped {
  type: 'VACATION_SET';
  on: boolean;
}
export interface SettingsChangedEvent extends Timestamped {
  type: 'SETTINGS_CHANGED';
  settings: Partial<Settings>;
  name?: string;
}
export interface TickEvent extends Timestamped {
  type: 'TICK';
}

/** Everything that can happen to a pet. State is `replay(events)`. */
export type PetEvent =
  | PetCreatedEvent
  | SessionStartedEvent
  | SessionCompletedEvent
  | SessionAbandonedEvent
  | DistractionReportedEvent
  | DistractionDetectedEvent
  | BreakTakenEvent
  | CommitMadeEvent
  | CiPassedEvent
  | PetPettedEvent
  | VacationSetEvent
  | SettingsChangedEvent
  | TickEvent;

export type PetEventType = PetEvent['type'];

/** All event type names, useful for validation. */
export const EVENT_TYPES: readonly PetEventType[] = [
  'PET_CREATED',
  'SESSION_STARTED',
  'SESSION_COMPLETED',
  'SESSION_ABANDONED',
  'DISTRACTION_REPORTED',
  'DISTRACTION_DETECTED',
  'BREAK_TAKEN',
  'COMMIT_MADE',
  'CI_PASSED',
  'PET_PETTED',
  'VACATION_SET',
  'SETTINGS_CHANGED',
  'TICK',
];
