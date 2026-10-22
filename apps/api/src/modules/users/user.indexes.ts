import type { CollectionIndexes } from '../../infrastructure/database/indexes.js';

export const USERS_COLLECTION = 'users';

export const USER_INDEXES: CollectionIndexes = {
  collection: USERS_COLLECTION,
  indexes: [{ name: 'email_1', key: { email: 1 }, unique: true }],
};
