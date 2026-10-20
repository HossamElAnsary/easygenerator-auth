import {
  apiErrorResponseSchema,
  userResponseSchema,
} from '@easy-generator/contracts';
import { verify } from 'argon2';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  api,
  clientIp,
  newAccount,
  setCookies,
  startTestApp,
  type TestApp,
} from './support/test-app.js';

describe('POST /api/auth/signup', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await startTestApp();
  }, 20_000);

  afterAll(async () => {
    await testApp?.close();
  });

  const users = () => testApp.database.client.db().collection('users');
  const usersWithEmail = (email: string) => users().find({ email }).toArray();

  it('creates one normalized account with an Argon2id hash and no session', async () => {
    const response = await api(testApp).post('/api/auth/signup').send({
      name: '  Ada   Lovelace  ',
      email: '  Ada.Lovelace+Notes@Example.COM ',
      password: 'Analytical-Engine1',
    });

    expect(response.status).toBe(201);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(setCookies(response)).toEqual([]);
    const { user } = userResponseSchema.parse(response.body);
    expect(user).toEqual({
      id: expect.stringMatching(/^[0-9a-f]{24}$/),
      email: 'ada.lovelace+notes@example.com',
      name: 'Ada   Lovelace',
    });

    const stored = await usersWithEmail('ada.lovelace+notes@example.com');
    expect(stored).toHaveLength(1);
    const [record] = stored;
    expect(record?._id.toHexString()).toBe(user.id);
    expect(Object.keys(record ?? {}).sort()).toEqual([
      '_id',
      'createdAt',
      'email',
      'name',
      'passwordHash',
      'updatedAt',
    ]);
    // PHC string: $argon2id$v=19$<parameters>$<salt>$<hash>; parameter order varies.
    const [, algorithm, version, parameters = ''] = String(
      record?.passwordHash,
    ).split('$');
    expect([algorithm, version]).toEqual(['argon2id', 'v=19']);
    expect(
      Object.fromEntries(parameters.split(',').map((pair) => pair.split('='))),
    ).toEqual({
      m: '19456',
      t: '2',
      p: '1',
    });
    expect(
      await verify(String(record?.passwordHash), 'Analytical-Engine1'),
    ).toBe(true);
    expect(
      await testApp.database.client
        .db()
        .collection('sessions')
        .countDocuments(),
    ).toBe(0);
  });

  it('hashes the password exactly as submitted', async () => {
    const account = newAccount({ password: '  Spaced Pässwörd 1!  ' });
    expect(
      (await api(testApp).post('/api/auth/signup').send(account)).status,
    ).toBe(201);
    const [record] = await usersWithEmail(account.email);
    const hash = String(record?.passwordHash);
    expect(await verify(hash, '  Spaced Pässwörd 1!  ')).toBe(true);
    expect(await verify(hash, 'Spaced Pässwörd 1!')).toBe(false);
  });

  it.each([
    [{ email: 'not-an-email' }, { email: ['Enter a valid email address.'] }],
    [{ email: { $gt: '' } }, { email: ['Enter a valid email address.'] }],
    [{ name: ' ab ' }, { name: ['Name must be at least 3 characters.'] }],
    [
      { password: 'password' },
      {
        password: [
          'Password must include a number.',
          'Password must include a special character.',
        ],
      },
    ],
    [
      { name: 42, password: 'Ab1!' },
      {
        name: ['Enter a valid name.'],
        password: ['Password must be at least 8 characters.'],
      },
    ],
  ])(
    'rejects %j on the server with field errors and stores nothing',
    async (change, fields) => {
      const account = newAccount();
      const response = await api(testApp)
        .post('/api/auth/signup')
        .send({ ...account, ...change });
      expect(response.status).toBe(400);
      expect(apiErrorResponseSchema.parse(response.body).error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Please check the highlighted fields.',
        fields,
        requestId: response.headers['x-request-id'],
      });
      expect(await usersWithEmail(account.email.toLowerCase())).toEqual([]);
    },
  );

  it.each([
    [
      'an unexpected role',
      (account: object) => ({ ...account, role: 'admin' }),
    ],
    ['an array body', (account: object) => [account]],
  ])('rejects %s without fields or echoing input', async (_case, shape) => {
    const account = newAccount();
    const response = await api(testApp)
      .post('/api/auth/signup')
      .send(shape(account));
    expect(response.status).toBe(400);
    expect(apiErrorResponseSchema.parse(response.body).error).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'The request body is invalid.',
      requestId: response.headers['x-request-id'],
    });
    expect(response.text).not.toContain('role');
    expect(response.text).not.toContain(account.email);
    expect(await usersWithEmail(account.email)).toEqual([]);
  });

  it.each(['__proto__', 'constructor', 'prototype'])(
    'rejects the extra key %s like any other unexpected property',
    async (key) => {
      const account = newAccount();
      // Raw JSON: an object literal would set the prototype instead of a key.
      const body = JSON.stringify(account).replace(
        /}$/,
        `,"${key}":{"admin":true}}`,
      );
      const response = await api(testApp)
        .post('/api/auth/signup')
        .set('Content-Type', 'application/json')
        .send(body);
      expect(response.status).toBe(400);
      expect(apiErrorResponseSchema.parse(response.body).error).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'The request body is invalid.',
      });
      expect(await usersWithEmail(account.email)).toEqual([]);
    },
  );

  it('enforces mutation controls on the real endpoint without creating an account', async () => {
    const account = newAccount();
    const crossSite = await api(testApp)
      .post('/api/auth/signup')
      .set('Origin', 'https://attacker.example')
      .send(account);
    expect(crossSite.status).toBe(403);
    const formPost = await api(testApp)
      .post('/api/auth/signup')
      .type('form')
      .send(account);
    expect(formPost.status).toBe(415);
    expect(await usersWithEmail(account.email)).toEqual([]);
  });

  it('rejects an equivalent email with 409 and keeps one account', async () => {
    const account = newAccount({ email: `dup.${Date.now()}@example.com` });
    expect(
      (await api(testApp).post('/api/auth/signup').send(account)).status,
    ).toBe(201);

    const duplicate = await api(testApp)
      .post('/api/auth/signup')
      .send({
        ...account,
        email: `  ${account.email.toUpperCase()} `,
        name: 'Someone Else',
      });
    expect(duplicate.status).toBe(409);
    expect(apiErrorResponseSchema.parse(duplicate.body).error).toEqual({
      code: 'EMAIL_IN_USE',
      message: 'An account with this email already exists.',
      requestId: duplicate.headers['x-request-id'],
    });
    expect(await usersWithEmail(account.email)).toHaveLength(1);
  });

  it('creates exactly one account when equivalent signups race', async () => {
    const email = `race.${Date.now()}@example.com`;
    const variants = [
      email,
      email.toUpperCase(),
      ` ${email} `,
      `\t${email}`,
      email,
    ];
    const responses = await Promise.all(
      variants.map((variant) =>
        api(testApp)
          .post('/api/auth/signup')
          .send(newAccount({ email: variant })),
      ),
    );
    const statuses = responses.map(({ status }) => status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409]);
    expect(await usersWithEmail(email)).toHaveLength(1);
  });

  it('limits each client to 5 signup attempts per minute', async () => {
    const client = clientIp();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await api(testApp)
        .post('/api/auth/signup', client)
        .send({});
      expect(response.status).toBe(400);
    }
    const limited = await api(testApp)
      .post('/api/auth/signup', client)
      .send({});
    expect(limited.status).toBe(429);
    expect(limited.headers['retry-after']).toBeDefined();
    expect((await api(testApp).post('/api/auth/signup').send({})).status).toBe(
      400,
    );
  });
});
