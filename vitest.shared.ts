import { defaultClientConditions, defaultServerConditions } from 'vite';

/**
 * Resolve workspace packages straight from their TypeScript sources during tests and
 * Vite builds, via the custom `daemonling-source` export condition.
 */
export const sharedResolve = {
  resolve: { conditions: ['daemonling-source', ...defaultClientConditions] },
  ssr: { resolve: { conditions: ['daemonling-source', ...defaultServerConditions] } },
};
