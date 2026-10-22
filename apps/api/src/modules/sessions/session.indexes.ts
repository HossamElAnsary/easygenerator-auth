import type { CollectionIndexes } from '../../infrastructure/database/indexes.js';

export const SESSIONS_COLLECTION = 'sessions';

export const SESSION_INDEXES: CollectionIndexes = {
  collection: SESSIONS_COLLECTION,
  indexes: [
    { name: 'tokenHash_1', key: { tokenHash: 1 }, unique: true },
    // TTL removal is cleanup only; lookups enforce expiry themselves.
    { name: 'expiresAt_1', key: { expiresAt: 1 }, expireAfterSeconds: 0 },
  ],
};
