/**
 * Rubber-duck debugging: the pet listens and asks one classic question after each line you
 * type. Fully offline, keyword-based and deterministic.
 */

interface DuckRule {
  keywords: readonly string[];
  question: string;
}

/** Keyword rules, checked in order. The first matching rule not yet asked wins. */
export const DUCK_RULES: readonly DuckRule[] = [
  {
    keywords: ['error', 'exception', 'crash', 'stack trace', 'panic'],
    question: 'What did you expect to happen instead?',
  },
  {
    keywords: ['error', 'exception', 'traceback'],
    question: 'What does the very first line of the error actually say?',
  },
  { keywords: ['test', 'spec', 'assert'], question: 'Which is the smallest failing case?' },
  {
    keywords: ['test', 'flaky', 'sometimes', 'intermittent'],
    question: 'What is different between a run that passes and one that fails?',
  },
  {
    keywords: ['slow', 'performance', 'latency', 'timeout'],
    question: 'Where does the time actually go? Have you measured it?',
  },
  {
    keywords: ['null', 'undefined', 'nil', 'none'],
    question: 'Where was that value supposed to be set, and who sets it?',
  },
  {
    keywords: ['works on', 'locally', 'production', 'prod', 'staging', 'ci'],
    question: 'What is different between the environment where it works and where it fails?',
  },
  {
    keywords: ['changed', 'since', 'yesterday', 'used to', 'regression'],
    question: 'What changed since it last worked? Could you bisect it?',
  },
  {
    keywords: ['api', 'request', 'response', 'http', 'fetch'],
    question: 'What exactly is sent, and what exactly comes back?',
  },
  {
    keywords: ['state', 'cache', 'stale'],
    question: 'Which piece of state do you trust least right now?',
  },
  {
    keywords: ['async', 'await', 'promise', 'race', 'thread', 'concurr'],
    question: 'What happens if those two things run in the other order?',
  },
  {
    keywords: ['type', 'compile', 'build'],
    question: 'What does the compiler think the type is, versus what you think it is?',
  },
  {
    keywords: ['loop', 'index', 'off by', 'array', 'list'],
    question: 'What happens on the first and the last item?',
  },
  {
    keywords: ['config', 'env', 'setting', 'flag'],
    question: 'Which value is actually loaded at runtime? Can you print it?',
  },
  {
    keywords: ['why', "don't know", 'no idea', 'confused', 'weird', 'strange'],
    question: 'What is the simplest explanation you have not ruled out yet?',
  },
  {
    keywords: ['fixed', 'works now', 'solved', 'found it'],
    question: 'Nice! Why did it work, and how will you know if it breaks again?',
  },
];

/** Generic follow-ups when no rule matches, cycled by turn number. */
export const DUCK_FALLBACKS: readonly string[] = [
  'Can you explain that line by line, as if I were very small? (I am.)',
  'What have you already ruled out?',
  'What is the one assumption you have not checked yet?',
  'If you had to write a failing test for this right now, what would it check?',
  'What would you tell a teammate who described this problem to you?',
];

/** Picks the duck's next question for a typed line, avoiding repeats where possible. */
export function duckQuestion(line: string, alreadyAsked: readonly string[] = []): string {
  const text = line.toLowerCase();
  for (const rule of DUCK_RULES) {
    if (alreadyAsked.includes(rule.question)) continue;
    if (rule.keywords.some((k) => text.includes(k))) return rule.question;
  }
  const unused = DUCK_FALLBACKS.filter((q) => !alreadyAsked.includes(q));
  const pool = unused.length > 0 ? unused : DUCK_FALLBACKS;
  return pool[alreadyAsked.length % pool.length]!;
}

/** Summarises a duck session: what the problem was, what was said, and the latest thought. */
export function duckSummary(lines: readonly string[]): string[] {
  const said = lines.map((l) => l.trim()).filter((l) => l.length > 0);
  if (said.length === 0) return ['You did not say anything, and that is okay. Quack.'];
  const out = [`You started with: "${said[0]}"`];
  if (said.length > 2) {
    out.push(...said.slice(1, -1).map((l) => `  then: "${l}"`));
  }
  if (said.length > 1) out.push(`Where you ended up: "${said[said.length - 1]}"`);
  out.push(`${said.length} ${said.length === 1 ? 'thought' : 'thoughts'} out loud. Quack.`);
  return out;
}
