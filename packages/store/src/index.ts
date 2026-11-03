/**
 * @daemonling/store — event log + snapshot persistence. This entry point is browser-safe (format,
 * migrations, IndexedDB adapter); the Node file adapter lives at `@daemonling/store/node`.
 */
export * from './format.js';
export { IndexedDbStore } from './idb.js';
export type { IndexedDbStoreOptions } from './idb.js';

/** Package version, kept in sync with package.json. */
export const VERSION = '0.1.0';
