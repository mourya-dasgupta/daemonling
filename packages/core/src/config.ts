/**
 * Every tunable number in the Daemonling simulation lives here, so the beta can be tuned in one
 * place. Names describe the effect; comments give the unit. See docs/GAME_DESIGN.md.
 */
export const CONFIG = {
  /** Version of the `PetState` shape produced by this engine. */
  stateSchemaVersion: 1,

  stats: {
    min: 0,
    max: 100,
    /** Starting values for a freshly created pet. */
    initial: { satiety: 70, mood: 60, health: 100, energy: 80, bond: 0 },
  },

  defaultSettings: {
    dailyGoalMinutes: 50,
    bedtimeHour: 23,
    wakeHour: 7,
    graceSeconds: 90,
    timezone: 'UTC',
  },

  settingsLimits: {
    dailyGoalMinutes: { min: 10, max: 480 },
    graceSeconds: { min: 10, max: 3600 },
  },

  decay: {
    /** Satiety lost per awake hour. */
    satietyPerHour: 2,
    /** Mood moves toward `moodBaseline` by this much per awake hour. */
    moodDriftPerHour: 1,
    moodBaseline: 50,
    /** Energy regained per awake hour while not in a session. */
    energyRecoveryPerHour: 4,
    /** Health regained per awake hour while well fed (satiety >= threshold). */
    healthRegenPerHour: 1,
    healthRegenSatietyThreshold: 50,
  },

  session: {
    /** Upper bound on minutes credited for one session (anti-typo, anti-cheat). */
    maxMinutes: 240,
    satietyPerMinute: 0.8,
    moodOnComplete: 8,
    xpPerMinute: 1,
    bondOnComplete: 1,
    /** Health regained on completion while sick. */
    healthWhenSick: 5,
    /** Energy spent per focused minute. */
    energyCostPerMinute: 0.1,
    /** `depth` trait grows for sessions at least this long. */
    deepMinutes: 50,
    /** `sprint` trait grows for sessions at most this long. */
    sprintMaxMinutes: 25,
    /** A session left running this long past its planned end silently expires. */
    staleAfterPlannedMinutes: 120,
  },

  abandon: { mood: -10, xpPerMinute: 0.2 },
  honestStop: { mood: -5, xpPerMinute: 0.5 },

  distraction: { moodPerDetection: -2, maxMoodPenaltyPerSession: -10 },

  breaks: {
    minMinutes: 10,
    energy: 10,
    /** Idle time (no session running) that counts as a natural break for overwork tracking. */
    naturalBreakMinutes: 45,
  },

  overwork: {
    focusMinutesThreshold: 180,
    energy: -15,
    mood: -5,
    lateSessionEnergy: -10,
  },

  commits: { satiety: 3, craft: 1, maxCountedPerDay: 10 },
  ci: { mood: 5, craft: 2 },

  hunger: {
    /** Satiety below this is "hungry". */
    threshold: 20,
    /** Grace period of continuous hunger before health starts to drop. */
    graceHours: 24,
    healthPerDay: -5,
    /** Health never drops below this — the pet never dies. */
    healthFloor: 10,
  },

  petting: { bond: 0.5, maxBondPerDay: 3, mood: 1 },

  conditions: {
    hibernateAfterDays: 7,
    sickBelowHealth: 40,
    sadBelowMood: 30,
    thriving: { mood: 70, satiety: 60, energy: 50 },
  },

  wake: { sessionsNeeded: 2, windowHours: 48, mood: 20 },

  streak: { freezeEvery: 7, maxFreezes: 2 },

  /** Tricks unlocked by streak length, in order. Never removed once learned. */
  streakTricks: [
    { streak: 3, trick: 'wave' },
    { streak: 7, trick: 'rubber-duck' },
    { streak: 14, trick: 'fetch-todos' },
    { streak: 21, trick: 'victory-dance' },
    { streak: 30, trick: 'signature-move' },
  ],
  bondTrick: { bond: 50, trick: 'purr' },

  stages: {
    hatchAfterSessions: 3,
    juvenileXp: 300,
    adultXp: 1500,
    adultMinAgeDays: 14,
    elderMinAgeDays: 90,
  },

  /**
   * Evolution divides each trait by its weight before picking the dominant one, because some
   * traits accrue faster than others (commits are frequent; deep sessions are rare).
   */
  traitWeights: { depth: 1, sprint: 1.5, balance: 1.5, craft: 3, night: 1 },

  journal: { maxEntries: 100 },
} as const;

export type Config = typeof CONFIG;
