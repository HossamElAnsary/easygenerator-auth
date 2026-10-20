import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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

const EPOCH = 'Thu, 01 Jan 1970 00:00:00 GMT';

describe('POST /api/auth/logout', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await startTestApp();
  }, 20_000);

  afterAll(async () => {
    await testApp?.close();
  });

  const sessionStored = async (token: string) =>
    (await testApp.database.client
      .db()
      .collection('sessions')
      .countDocuments({
        tokenHash: createHash('sha256').update(token).digest('hex'),
      })) === 1;
  const me = (cookieHeader: string) =>
    api(testApp).get('/api/auth/me').set('Cookie', cookieHeader);
  const logout = (cookieHeader?: string) => {
    const call = api(testApp).post('/api/auth/logout');
    return (cookieHeader ? call.set('Cookie', cookieHeader) : call).send({});
  };

  async function signedInSession() {
    const account = newAccount();
    await signUp(testApp, account);
    return signIn(testApp, account);
  }

  it('revokes the presented session, expires the cookie, and rejects replay', async () => {
    const session = await signedInSession();
    const response = await logout(session.cookieHeader);

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    const [cleared, ...others] = setCookies(response);
    expect(others).toEqual([]);
    expect(cleared?.name).toBe('session');
    expect(cleared?.value).toBe('');
    expect(Object.fromEntries(cleared?.attributes ?? [])).toEqual({
      path: '/',
      expires: EPOCH,
      httponly: '',
      samesite: 'Lax',
    });
    expect(await sessionStored(session.token)).toBe(false);
    expect((await me(session.cookieHeader)).status).toBe(401);
  });

  it('succeeds idempotently for missing, malformed, and already revoked sessions', async () => {
    const session = await signedInSession();
    expect((await logout(session.cookieHeader)).status).toBe(204);
    for (const cookie of [
      session.cookieHeader,
      undefined,
      'session=not-a-token',
    ]) {
      const response = await logout(cookie);
      expect(response.status).toBe(204);
    }
  });

  it('revokes only the presented session', async () => {
    const account = newAccount();
    await signUp(testApp, account);
    const phone = await signIn(testApp, account);
    const laptop = await signIn(testApp, account);
    expect((await logout(phone.cookieHeader)).status).toBe(204);
    expect((await me(laptop.cookieHeader)).status).toBe(200);
  });

  it('keeps the session when the body or mutation controls are rejected', async () => {
    const session = await signedInSession();
    const withBody = await api(testApp)
      .post('/api/auth/logout')
      .set('Cookie', session.cookieHeader)
      .send({ token: session.token });
    expect(withBody.status).toBe(400);
    const crossSite = await api(testApp)
      .post('/api/auth/logout')
      .set('Cookie', session.cookieHeader)
      .unset('Origin')
      .send({});
    expect(crossSite.status).toBe(403);
    for (const response of [withBody, crossSite])
      expect(setCookies(response)).toEqual([]);
    expect((await me(session.cookieHeader)).status).toBe(200);
  });

  it('limits each client to 30 logouts per minute', async () => {
    const client = clientIp();
    for (let attempt = 0; attempt < 30; attempt += 1) {
      expect(
        (await api(testApp).post('/api/auth/logout', client).send({})).status,
      ).toBe(204);
    }
    const limited = await api(testApp)
      .post('/api/auth/logout', client)
      .send({});
    expect(limited.status).toBe(429);
  });
});
