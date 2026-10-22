import { createHash } from 'node:crypto';
import {
  apiErrorResponseSchema,
  userResponseSchema,
} from '@easy-generator/contracts';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PasswordHasher } from '../src/modules/auth/password-hasher.js';
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

const DAY_MS = 24 * 60 * 60 * 1000;
// 32 random bytes in base64url: 42 free characters, then one of 16 final ones.
const CANONICAL_TOKEN = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;

describe('POST /api/auth/signin', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await startTestApp();
  }, 20_000);

  afterAll(async () => {
    await testApp?.close();
  });

  const sessions = () => testApp.database.client.db().collection('sessions');

  it('returns the public user and a 24-hour HttpOnly cookie for correct credentials', async () => {
    const account = newAccount();
    const user = await signUp(testApp, account);
    const response = await api(testApp)
      .post('/api/auth/signin')
      .send({ email: account.email, password: account.password });

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(userResponseSchema.parse(response.body)).toEqual({ user });

    const [cookie, ...others] = setCookies(response);
    expect(others).toEqual([]);
    expect(cookie?.name).toBe('session');
    expect(cookie?.value).toMatch(CANONICAL_TOKEN);
    expect(Object.fromEntries(cookie?.attributes ?? [])).toEqual({
      path: '/',
      expires: expect.any(String),
      httponly: '',
      samesite: 'Lax',
    });

    // Only the SHA-256 verifier is stored, never the raw token.
    const token = String(cookie?.value);
    const verifier = createHash('sha256').update(token).digest('hex');
    const stored = await sessions()
      .find({ userId: { $exists: true } })
      .toArray();
    const record = stored.find((session) => session.tokenHash === verifier);
    expect(record?.userId.toHexString()).toBe(user.id);
    expect(JSON.stringify(stored)).not.toContain(token);
    expect(record?.expiresAt.getTime() - record?.createdAt.getTime()).toBe(
      DAY_MS,
    );
    const cookieExpiry = Date.parse(String(cookie?.attributes.get('expires')));
    expect(Math.abs(cookieExpiry - record?.expiresAt.getTime())).toBeLessThan(
      1000,
    );
  });

  it('compares the password exactly as submitted, whitespace included', async () => {
    const account = newAccount({ password: '  Spaced Pässwörd 1!  ' });
    await signUp(testApp, account);
    const attempt = (password: string) =>
      api(testApp)
        .post('/api/auth/signin')
        .send({ email: account.email, password });
    expect((await attempt('  Spaced Pässwörd 1!  ')).status).toBe(200);
    expect((await attempt('Spaced Pässwörd 1!')).status).toBe(401);
  });

  it('normalizes the signin email like signup', async () => {
    const account = newAccount();
    await signUp(testApp, account);
    const response = await api(testApp)
      .post('/api/auth/signin')
      .send({
        email: `  ${account.email.toUpperCase()} `,
        password: account.password,
      });
    expect(response.status).toBe(200);
  });

  it('answers an unknown email and a wrong password identically, without a cookie', async () => {
    const account = newAccount();
    await signUp(testApp, account);
    const before = await sessions().countDocuments();
    const attempts = [
      { email: account.email, password: `${account.password}x` },
      { email: newAccount().email, password: account.password },
      // Short and composition-failing, but nonempty: a credential failure.
      { email: account.email, password: 'abc' },
    ];
    for (const attempt of attempts) {
      const response = await api(testApp)
        .post('/api/auth/signin')
        .send(attempt);
      expect(response.status).toBe(401);
      expect(apiErrorResponseSchema.parse(response.body).error).toEqual({
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect.',
        requestId: response.headers['x-request-id'],
      });
      expect(setCookies(response)).toEqual([]);
    }
    expect(await sessions().countDocuments()).toBe(before);
  });

  it('spends a dummy password verification when the email is unknown', async () => {
    const hasher = testApp.app.get(PasswordHasher);
    const spy = vi.spyOn(hasher, 'verifyUnknownAccount');
    try {
      const response = await api(testApp)
        .post('/api/auth/signin')
        .send({ email: newAccount().email, password: 'Whatever-1' });
      expect(response.status).toBe(401);
      expect(spy).toHaveBeenCalledWith('Whatever-1');
    } finally {
      spy.mockRestore();
    }
  });

  it('validates input shape but not signup password rules', async () => {
    const response = await api(testApp)
      .post('/api/auth/signin')
      .send({ email: 'not-an-email', password: '' });
    expect(response.status).toBe(400);
    expect(apiErrorResponseSchema.parse(response.body).error.fields).toEqual({
      email: ['Enter a valid email address.'],
      password: ['Enter your password.'],
    });
  });

  it('issues a fresh token for every signin', async () => {
    const account = newAccount();
    await signUp(testApp, account);
    const first = await signIn(testApp, account);
    const second = await signIn(testApp, account);
    expect(first.token).not.toBe(second.token);
    expect(
      await sessions().countDocuments({
        tokenHash: {
          $in: [first.token, second.token].map((token) =>
            createHash('sha256').update(token).digest('hex'),
          ),
        },
      }),
    ).toBe(2);
  });

  it('enforces mutation controls on signin', async () => {
    const account = newAccount();
    await signUp(testApp, account);
    const response = await api(testApp)
      .post('/api/auth/signin')
      .unset('X-CSRF-Protection')
      .send({ email: account.email, password: account.password });
    expect(response.status).toBe(403);
    expect(setCookies(response)).toEqual([]);
  });

  it('limits each client to 10 signin attempts per minute', async () => {
    const client = clientIp();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await api(testApp)
        .post('/api/auth/signin', client)
        .send({ email: 'not-an-email', password: 'x' });
      expect(response.status).toBe(400);
    }
    const limited = await api(testApp)
      .post('/api/auth/signin', client)
      .send({ email: 'not-an-email', password: 'x' });
    expect(limited.status).toBe(429);
    expect(limited.headers['retry-after']).toBeDefined();
  });
});
