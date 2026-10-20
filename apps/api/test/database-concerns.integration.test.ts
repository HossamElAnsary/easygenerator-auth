import type { mongo } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  api,
  newAccount,
  signIn,
  signUp,
  startTestApp,
  type TestApp,
} from './support/test-app.js';

const WRITE_CONCERN = { w: 'majority', j: true, wtimeout: 5000 };

describe('database concern policy as received by MongoDB', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await startTestApp();
  }, 20_000);

  afterAll(async () => {
    await testApp?.close();
  });

  it('sends majority/journaled writes, majority user reads, and linearizable session lookups', async () => {
    const db = testApp.database.client.db();
    await db.command({ profile: 2 });
    let operations: mongo.Document[];
    try {
      const account = newAccount();
      await signUp(testApp, account);
      const session = await signIn(testApp, account);
      const me = await api(testApp)
        .get('/api/auth/me')
        .set('Cookie', session.cookieHeader);
      expect(me.status).toBe(200);
    } finally {
      await db.command({ profile: 0 });
      operations = await db.collection('system.profile').find().toArray();
    }
    const onCollection = (name: string, op: string) =>
      operations.filter(
        (entry) => entry.ns === `${db.databaseName}.${name}` && entry.op === op,
      );

    for (const insert of [
      ...onCollection('users', 'insert'),
      ...onCollection('sessions', 'insert'),
    ]) {
      expect(insert.command.writeConcern).toEqual(WRITE_CONCERN);
    }
    expect(onCollection('users', 'insert')).toHaveLength(1);
    expect(onCollection('sessions', 'insert')).toHaveLength(1);

    const userReads = onCollection('users', 'query');
    expect(userReads.length).toBeGreaterThanOrEqual(2);
    for (const read of userReads) {
      expect(read.command.readConcern).toEqual({ level: 'majority' });
    }

    const sessionReads = onCollection('sessions', 'query');
    expect(sessionReads).toHaveLength(1);
    expect(sessionReads[0]?.command).toMatchObject({
      readConcern: { level: 'linearizable' },
      maxTimeMS: 5000,
    });
  });
});
