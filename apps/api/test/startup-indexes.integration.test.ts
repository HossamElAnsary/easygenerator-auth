import { describe, expect, it } from 'vitest';
import { startTestApp } from './support/test-app.js';
import { isolatedDatabase } from './test-database.js';

/** Index definitions as MongoDB reports them, minus the version field. */
async function indexesOf(
  database: ReturnType<typeof isolatedDatabase>,
  collection: string,
) {
  const indexes = await database.client.db().collection(collection).indexes();
  return indexes
    .map((index) =>
      Object.fromEntries(Object.entries(index).filter(([key]) => key !== 'v')),
    )
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

describe('startup index verification', () => {
  it('creates the required unique and TTL indexes before serving', async () => {
    const testApp = await startTestApp();
    try {
      expect(await indexesOf(testApp.database, 'users')).toEqual([
        { key: { _id: 1 }, name: '_id_' },
        { key: { email: 1 }, name: 'email_1', unique: true },
      ]);
      expect(await indexesOf(testApp.database, 'sessions')).toEqual([
        { key: { _id: 1 }, name: '_id_' },
        { key: { expiresAt: 1 }, name: 'expiresAt_1', expireAfterSeconds: 0 },
        { key: { tokenHash: 1 }, name: 'tokenHash_1', unique: true },
      ]);
    } finally {
      await testApp.close();
    }
  }, 20_000);

  it('leaves unrelated existing indexes in place', async () => {
    const database = isolatedDatabase();
    await database.client.connect();
    try {
      await database.client
        .db()
        .collection('users')
        .createIndex({ createdAt: 1 }, { name: 'createdAt_1' });
      const testApp = await startTestApp({ database });
      await testApp.close();
      expect(
        (await indexesOf(database, 'users')).map(({ name }) => name),
      ).toEqual(['_id_', 'createdAt_1', 'email_1']);
    } finally {
      await database.cleanup();
    }
  }, 20_000);

  it('fails closed on a conflicting index and does not replace it', async () => {
    const database = isolatedDatabase();
    await database.client.connect();
    try {
      // Same name, but not unique: duplicate emails would be possible.
      await database.client
        .db()
        .collection('users')
        .createIndex({ email: 1 }, { name: 'email_1' });
      await expect(startTestApp({ database })).rejects.toThrow(
        'Application startup checks failed.',
      );
      expect(await indexesOf(database, 'users')).toEqual([
        { key: { _id: 1 }, name: '_id_' },
        { key: { email: 1 }, name: 'email_1' },
      ]);
    } finally {
      await database.cleanup();
    }
  }, 20_000);
});
