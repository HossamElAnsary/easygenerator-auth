import { randomBytes } from 'node:crypto';
import {
  apiErrorResponseSchema,
  userResponseSchema,
} from '@easy-generator/contracts';
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ProbeModule, ProbeRecorder } from './support/probe.module.js';
import {
  api,
  clientIp,
  newAccount,
  setCookies,
  signIn,
  signUp,
  startTestApp,
  type TestApp,
} from './support/test-app.js';
import { isolatedDatabase } from './test-database.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function expectUnauthenticated(response: {
  status: number;
  body: unknown;
  headers: Record<string, unknown>;
}) {
  expect(response.status).toBe(401);
  expect(apiErrorResponseSchema.parse(response.body).error).toEqual({
    code: 'UNAUTHENTICATED',
    message: 'Sign in to continue.',
    requestId: response.headers['x-request-id'],
  });
  // A delayed 401 must never erase a cookie issued by a newer signin.
  expect(setCookies(response)).toEqual([]);
}

describe('GET /api/auth/me and default authentication', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await startTestApp({ imports: [ProbeModule] });
  }, 20_000);

  afterAll(async () => {
    await testApp?.close();
  });

  it('returns only the session owner and never sets cookies', async () => {
    const [ada, grace] = [newAccount({ name: 'Ada Lovelace' }), newAccount()];
    const adaUser = await signUp(testApp, ada);
    const graceUser = await signUp(testApp, grace);
    const adaSession = await signIn(testApp, ada);
    const graceSession = await signIn(testApp, grace);

    for (const [session, owner] of [
      [adaSession, adaUser],
      [graceSession, graceUser],
    ] as const) {
      const response = await api(testApp)
        .get('/api/auth/me')
        .set('Cookie', session.cookieHeader);
      expect(response.status).toBe(200);
      expect(userResponseSchema.parse(response.body)).toEqual({ user: owner });
      expect(setCookies(response)).toEqual([]);
    }

    // Browser-supplied identity claims never change the resolved owner.
    const claimed = await api(testApp)
      .get(`/api/auth/me?userId=${graceUser.id}`)
      .set('Cookie', adaSession.cookieHeader)
      .set('X-User-Id', graceUser.id);
    expect(claimed.body).toEqual({ user: adaUser });
  });

  it.each([
    ['no cookie', undefined],
    ['a short token', 'session=abc'],
    ['a non-canonical final character', `session=${'A'.repeat(42)}B`],
    ['characters outside base64url', `session=${'A'.repeat(42)}+`],
    ['a JSON-encoded cookie value', 'session=j%3A%7B%7D'],
    [
      'a well-formed but unknown token',
      `session=${randomBytes(32).toString('base64url')}`,
    ],
  ])('rejects %s with 401', async (_case, cookie) => {
    const call = api(testApp).get('/api/auth/me');
    expectUnauthenticated(await (cookie ? call.set('Cookie', cookie) : call));
  });

  it('queries the database only for well-formed tokens', async () => {
    const db = testApp.database.client.db();
    await db.command({ profile: 2 });
    try {
      for (const cookie of [
        'session=abc',
        `session=${'A'.repeat(42)}B`,
        `session=${'A'.repeat(42)}+`,
        `session=${'A'.repeat(44)}`,
        'session=j%3A%7B%7D',
        `session=${randomBytes(32).toString('base64url')}`,
      ]) {
        expect(
          (await api(testApp).get('/api/auth/me').set('Cookie', cookie)).status,
        ).toBe(401);
      }
    } finally {
      await db.command({ profile: 0 });
    }
    // Only the last, canonical token reaches MongoDB.
    expect(
      await db.collection('system.profile').countDocuments({
        ns: `${db.databaseName}.sessions`,
        op: 'query',
      }),
    ).toBe(1);
  });

  it('rejects a session whose user no longer exists', async () => {
    const account = newAccount();
    const user = await signUp(testApp, account);
    const session = await signIn(testApp, account);
    await testApp.database.client
      .db()
      .collection('users')
      .deleteOne({ _id: new Types.ObjectId(user.id) });
    expectUnauthenticated(
      await api(testApp)
        .get('/api/auth/me')
        .set('Cookie', session.cookieHeader),
    );
  });

  it('requires a session for handlers without a public marker', async () => {
    const recorder = testApp.app.get(ProbeRecorder);
    recorder.calls = 0;
    expectUnauthenticated(await api(testApp).get('/api/test-probe/private'));
    expect(recorder.calls).toBe(0);

    const account = newAccount();
    const user = await signUp(testApp, account);
    const session = await signIn(testApp, account);
    const response = await api(testApp)
      .get('/api/test-probe/private')
      .set('Cookie', session.cookieHeader);
    expect(response.body).toEqual({ user });
    expect(recorder.calls).toBe(1);
  });

  it('keeps the planned public routes reachable without a session', async () => {
    expect((await api(testApp).get('/api/health')).status).toBe(200);
    expect((await api(testApp).post('/api/auth/signup').send({})).status).toBe(
      400,
    );
    expect((await api(testApp).post('/api/auth/signin').send({})).status).toBe(
      400,
    );
    expect((await api(testApp).post('/api/auth/logout').send({})).status).toBe(
      204,
    );
  });

  it('applies the rate limit before looking up a session', async () => {
    const client = clientIp();
    for (let request = 0; request < 120; request += 1) {
      expect((await api(testApp).get('/api/auth/me', client)).status).toBe(401);
    }
    expect((await api(testApp).get('/api/auth/me', client)).status).toBe(429);
  });
});

describe('session expiry', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await startTestApp();
  }, 20_000);

  afterAll(async () => {
    await testApp?.close();
  });

  it('accepts a session until exactly 24 hours after issuance, before TTL cleanup', async () => {
    const account = newAccount();
    await signUp(testApp, account);
    testApp.clock.freeze();
    const session = await signIn(testApp, account);
    const me = () =>
      api(testApp).get('/api/auth/me').set('Cookie', session.cookieHeader);

    testApp.clock.advance(DAY_MS - 1);
    expect((await me()).status).toBe(200);

    // Valid only while expiresAt > now, so the session ends at exactly 24h.
    testApp.clock.advance(1);
    expectUnauthenticated(await me());
    // The document is still stored: rejection came from the lookup, not TTL.
    expect(
      await testApp.database.client
        .db()
        .collection('sessions')
        .countDocuments(),
    ).toBe(1);
  });
});

describe('API restart', () => {
  it('keeps a valid session across an API process restart', async () => {
    const database = isolatedDatabase();
    await database.client.connect();
    try {
      const account = newAccount();
      const first = await startTestApp({ database });
      const user = await signUp(first, account);
      const session = await signIn(first, account);
      await first.close();

      const second = await startTestApp({ database });
      try {
        const response = await api(second)
          .get('/api/auth/me')
          .set('Cookie', session.cookieHeader);
        expect(response.body).toEqual({ user });
      } finally {
        await second.close();
      }
    } finally {
      await database.cleanup();
    }
  }, 30_000);
});
