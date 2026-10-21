import { createHash } from 'node:crypto';
import { apiErrorResponseSchema } from '@easy-generator/contracts';
import { getModelToken } from '@nestjs/mongoose';
import mongoose, { type Model } from 'mongoose';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { DatabaseService } from '../src/infrastructure/database/database.service.js';
import { SESSION_MODEL } from '../src/modules/sessions/session.schema.js';
import { USER_MODEL } from '../src/modules/users/user.schema.js';
import { UsersRepository } from '../src/modules/users/index.js';
import {
  api,
  newAccount,
  setCookies,
  signIn,
  signUp,
  startTestApp,
  type TestApp,
} from './support/test-app.js';

const {
  MongoNetworkError,
  MongoServerError,
  MongoServerSelectionError,
  MongoWriteConcernError,
} = mongoose.mongo;

/** Read failures a live client reports while MongoDB is unavailable. */
const READ_OUTAGES: [string, () => Error][] = [
  [
    'a server selection timeout',
    () =>
      new MongoServerSelectionError(
        'Server selection timed out after 5000 ms',
        {
          servers: new Map(),
          type: 'ReplicaSetNoPrimary',
        } as never,
      ),
  ],
  [
    'an exceeded time limit (code 50)',
    () =>
      new MongoServerError({
        code: 50,
        errmsg: 'operation exceeded time limit',
      }),
  ],
  [
    'a primary that stepped down (code 10107)',
    () => new MongoServerError({ code: 10107, errmsg: 'not primary' }),
  ],
];

/** "The write may have been applied, but majority acknowledgment timed out." */
const acknowledgmentLost = () =>
  new MongoWriteConcernError({
    ok: 1,
    writeConcernError: {
      code: 64,
      errmsg: 'waiting for replication timed out',
    },
  });
/** "The request never reached the server." */
const notApplied = () =>
  new MongoNetworkError('connection reset before the write');

function expectUnavailable(response: {
  status: number;
  body: unknown;
  headers: Record<string, unknown>;
}) {
  expect(response.status).toBe(503);
  expect(apiErrorResponseSchema.parse(response.body).error).toEqual({
    code: 'SERVICE_UNAVAILABLE',
    message: 'The service is temporarily unavailable. Try again shortly.',
    requestId: response.headers['x-request-id'],
  });
  expect(setCookies(response)).toEqual([]);
}

describe('uncertain and failed database writes', () => {
  let testApp: TestApp;
  let users: Model<unknown>;
  let sessions: Model<unknown>;

  beforeAll(async () => {
    testApp = await startTestApp();
    users = testApp.app.get(getModelToken(USER_MODEL));
    sessions = testApp.app.get(getModelToken(SESSION_MODEL));
  }, 20_000);

  afterAll(async () => {
    await testApp?.close();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const stored = (collection: string, filter: object) =>
    testApp.database.client.db().collection(collection).countDocuments(filter);
  const me = (cookieHeader: string) =>
    api(testApp).get('/api/auth/me').set('Cookie', cookieHeader);
  const logout = (cookieHeader: string) =>
    api(testApp).post('/api/auth/logout').set('Cookie', cookieHeader).send({});

  it('reports a lost signup acknowledgment as 503 without claiming nothing was created', async () => {
    const account = newAccount();
    const create = users.create.bind(users);
    vi.spyOn(users, 'create').mockImplementationOnce(
      async (...args: unknown[]) => {
        await (create as (...a: unknown[]) => Promise<unknown>)(...args);
        throw acknowledgmentLost();
      },
    );
    expectUnavailable(
      await api(testApp).post('/api/auth/signup').send(account),
    );

    // The account exists after all: a retry conflicts and signin works.
    expect(await stored('users', { email: account.email })).toBe(1);
    expect(
      (await api(testApp).post('/api/auth/signup').send(account)).status,
    ).toBe(409);
    expect((await signIn(testApp, account)).user.email).toBe(account.email);
  });

  it('reports a signup write that never reached MongoDB as 503', async () => {
    const account = newAccount();
    vi.spyOn(users, 'create').mockRejectedValueOnce(notApplied());
    expectUnavailable(
      await api(testApp).post('/api/auth/signup').send(account),
    );
    expect(await stored('users', { email: account.email })).toBe(0);
  });

  it('sets no cookie when the session write is not acknowledged', async () => {
    const account = newAccount();
    const user = await signUp(testApp, account);
    const create = sessions.create.bind(sessions);
    vi.spyOn(sessions, 'create').mockImplementationOnce(
      async (...args: unknown[]) => {
        await (create as (...a: unknown[]) => Promise<unknown>)(...args);
        throw acknowledgmentLost();
      },
    );
    expectUnavailable(
      await api(testApp)
        .post('/api/auth/signin')
        .send({ email: account.email, password: account.password }),
    );
    // An unused session may remain until TTL cleanup; no client holds it.
    expect(
      await stored('sessions', {
        userId: new mongoose.Types.ObjectId(user.id),
      }),
    ).toBe(1);
  });

  it('keeps the cookie when revocation is not confirmed, and reconciles on retry', async () => {
    const account = newAccount();
    await signUp(testApp, account);
    const session = await signIn(testApp, account);
    const deleteOne = sessions.deleteOne.bind(sessions);
    // The service awaits the query, so an async stand-in has the same effect.
    vi.spyOn(sessions, 'deleteOne').mockImplementationOnce((async (
      ...args: unknown[]
    ) => {
      await (deleteOne as (...a: unknown[]) => PromiseLike<unknown>)(...args);
      throw acknowledgmentLost();
    }) as never);
    expectUnavailable(await logout(session.cookieHeader));

    // The deletion was applied: the session no longer authenticates, and a
    // retry confirms absence authoritatively before reporting success.
    expect((await me(session.cookieHeader)).status).toBe(401);
    const retry = await logout(session.cookieHeader);
    expect(retry.status).toBe(204);
    expect(setCookies(retry)).toHaveLength(1);
  });

  it('does not report logout success when a zero-match delete leaves the session in place', async () => {
    const account = newAccount();
    await signUp(testApp, account);
    const session = await signIn(testApp, account);
    vi.spyOn(sessions, 'deleteOne').mockResolvedValueOnce({
      acknowledged: true,
      deletedCount: 0,
    } as never);
    expectUnavailable(await logout(session.cookieHeader));
    expect((await me(session.cookieHeader)).status).toBe(200);
  });

  it('keeps the session valid when the delete never reached MongoDB', async () => {
    const account = newAccount();
    await signUp(testApp, account);
    const session = await signIn(testApp, account);
    vi.spyOn(sessions, 'deleteOne').mockRejectedValueOnce(notApplied());
    expectUnavailable(await logout(session.cookieHeader));
    expect((await me(session.cookieHeader)).status).toBe(200);
    const tokenHash = createHash('sha256').update(session.token).digest('hex');
    expect(await stored('sessions', { tokenHash })).toBe(1);
  });

  it.each(READ_OUTAGES)(
    'reports %s during the session lookup as 503, not 401',
    async (_case, outage) => {
      const account = newAccount();
      await signUp(testApp, account);
      const session = await signIn(testApp, account);
      vi.spyOn(sessions.collection, 'findOne').mockRejectedValueOnce(outage());
      expectUnavailable(await me(session.cookieHeader));
      expect((await me(session.cookieHeader)).status).toBe(200);
    },
  );

  it.each(READ_OUTAGES)(
    'reports %s during the credential lookup as 503, not 401',
    async (_case, outage) => {
      const account = newAccount();
      await signUp(testApp, account);
      // The service awaits `findOne(...).lean()`; only that chain is replaced.
      vi.spyOn(users, 'findOne').mockReturnValueOnce({
        lean: () => Promise.reject(outage()),
      } as never);
      expectUnavailable(
        await api(testApp)
          .post('/api/auth/signin')
          .send({ email: account.email, password: account.password }),
      );
    },
  );

  it('turns unexpected failures into a safe 500 and logs only the error type', async () => {
    const secret = 'driver said: duplicate value grace@example.com';
    vi.spyOn(
      testApp.app.get(UsersRepository),
      'findCredentialsByEmail',
    ).mockRejectedValueOnce(new TypeError(secret));
    const response = await api(testApp)
      .post('/api/auth/signin')
      .send({ email: 'grace@example.com', password: 'Compiler-1952' });
    expect(response.status).toBe(500);
    expect(apiErrorResponseSchema.parse(response.body).error).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Try again later.',
      requestId: response.headers['x-request-id'],
    });
    expect(response.text).not.toContain('grace@example.com');
    const logged = testApp.logger.records.filter(
      (record) => record.requestId === response.headers['x-request-id'],
    );
    expect(logged).toEqual([
      {
        level: 'error',
        event: 'unexpected_error',
        requestId: response.headers['x-request-id'],
        errorType: 'TypeError',
      },
      expect.objectContaining({
        event: 'http_request',
        status: 500,
        code: 'INTERNAL_ERROR',
      }),
    ]);
    expect(testApp.logger.lines.join('\n')).not.toContain('grace@example.com');
  });
});

describe('database outage', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await startTestApp();
  }, 20_000);

  afterAll(async () => {
    await testApp?.close();
  });

  it('reports 503 for every dependent operation instead of auth failures or success', async () => {
    const account = newAccount();
    await signUp(testApp, account);
    const session = await signIn(testApp, account);
    await testApp.app.get(DatabaseService).connection.close();

    expectUnavailable(
      await api(testApp).post('/api/auth/signup').send(newAccount()),
    );
    expectUnavailable(
      await api(testApp)
        .post('/api/auth/signin')
        .send({ email: account.email, password: account.password }),
    );
    expectUnavailable(
      await api(testApp)
        .get('/api/auth/me')
        .set('Cookie', session.cookieHeader),
    );
    expectUnavailable(
      await api(testApp)
        .post('/api/auth/logout')
        .set('Cookie', session.cookieHeader)
        .send({}),
    );
    const health = await api(testApp).get('/api/health');
    expect(health.status).toBe(503);
    expect(health.body).toEqual({ status: 'unavailable' });

    expect(
      testApp.logger.records.filter(
        ({ event }) => event === 'dependency_unavailable',
      ),
    ).toEqual(
      Array(4).fill(
        expect.objectContaining({ errorType: 'MongoNotConnectedError' }),
      ),
    );
  });
});

describe('log and response hygiene', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await startTestApp();
  }, 20_000);

  afterAll(async () => {
    await testApp?.close();
  });

  it('keeps credentials, identities, and session material out of every log line', async () => {
    const account = newAccount({
      email: `Mixed.Case.${Date.now()}@Example.com`,
    });
    const signup = await api(testApp).post('/api/auth/signup').send(account);
    const session = await signIn(testApp, account);
    await api(testApp).get('/api/auth/me').set('Cookie', session.cookieHeader);
    await api(testApp)
      .post('/api/auth/signin')
      .send({ email: account.email, password: `${account.password}-wrong` });
    await api(testApp)
      .post('/api/auth/signup')
      .send({ ...account, password: 'short' });
    await api(testApp)
      .post('/api/auth/logout')
      .set('Cookie', session.cookieHeader)
      .send({});

    const [user] = await testApp.database.client
      .db()
      .collection('users')
      .find({ email: account.email.toLowerCase() })
      .toArray();
    const secrets = [
      account.email,
      account.email.toLowerCase(),
      account.password,
      String(user?.passwordHash),
      session.token,
      createHash('sha256').update(session.token).digest('hex'),
      testApp.database.name,
    ];
    const logs = testApp.logger.lines.join('\n');
    expect(testApp.logger.lines.length).toBeGreaterThanOrEqual(6);
    for (const secret of secrets) expect(logs).not.toContain(secret);
    expect(logs).not.toMatch(/mongodb:\/\//);

    // Responses expose only the public user; the token travels in Set-Cookie only.
    for (const body of [
      JSON.stringify(signup.body),
      JSON.stringify(session.response.body),
    ]) {
      for (const secret of secrets.slice(2)) expect(body).not.toContain(secret);
    }
  });
});
