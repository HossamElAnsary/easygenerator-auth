import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  api,
  newAccount,
  setCookies,
  signUp,
  startTestApp,
  type TestApp,
} from './support/test-app.js';

const SHELL = '<!doctype html><title>stub shell</title>';

describe('production configuration', () => {
  let testApp: TestApp;
  let webDirectory: string;

  beforeAll(async () => {
    // A stand-in for the built web app, so static routing runs in production mode.
    webDirectory = await mkdtemp(join(tmpdir(), 'easy-generator-web-'));
    await mkdir(join(webDirectory, 'assets'));
    await writeFile(join(webDirectory, 'index.html'), SHELL);
    await writeFile(join(webDirectory, 'assets', 'app.js'), 'export {};');
    testApp = await startTestApp({
      env: {
        NODE_ENV: 'production',
        APP_ORIGIN: 'https://app.example.test',
        SERVE_WEB: 'true',
      },
      webDirectory,
    });
  }, 20_000);

  afterAll(async () => {
    await testApp?.close();
    if (webDirectory) await rm(webDirectory, { recursive: true, force: true });
  });

  it('issues and clears a __Host- cookie that is Secure, HttpOnly, Lax, and host-only', async () => {
    const account = newAccount();
    await signUp(testApp, account);
    const signin = await api(testApp)
      .post('/api/auth/signin')
      .send({ email: account.email, password: account.password });
    expect(signin.status).toBe(200);
    const [issued] = setCookies(signin);
    expect(issued?.name).toBe('__Host-session');
    expect(Object.fromEntries(issued?.attributes ?? [])).toEqual({
      path: '/',
      expires: expect.any(String),
      httponly: '',
      secure: '',
      samesite: 'Lax',
    });

    const cookieHeader = `__Host-session=${issued?.value}`;
    const me = await api(testApp)
      .get('/api/auth/me')
      .set('Cookie', cookieHeader);
    expect(me.status).toBe(200);

    const logout = await api(testApp)
      .post('/api/auth/logout')
      .set('Cookie', cookieHeader)
      .send({});
    const [cleared] = setCookies(logout);
    expect(cleared?.name).toBe('__Host-session');
    expect(Object.fromEntries(cleared?.attributes ?? [])).toEqual({
      path: '/',
      expires: 'Thu, 01 Jan 1970 00:00:00 GMT',
      httponly: '',
      secure: '',
      samesite: 'Lax',
    });
  });

  it('ignores the development cookie name', async () => {
    const account = newAccount();
    await signUp(testApp, account);
    const signin = await api(testApp)
      .post('/api/auth/signin')
      .send({ email: account.email, password: account.password });
    const token = setCookies(signin)[0]?.value;
    const me = await api(testApp)
      .get('/api/auth/me')
      .set('Cookie', `session=${token}`);
    expect(me.status).toBe(401);
  });

  it('sends HSTS and a CSP that upgrades requests and allows only same-origin scripts', async () => {
    const response = await api(testApp).get('/api/health');
    expect(response.headers['strict-transport-security']).toBe(
      'max-age=31536000; includeSubDomains',
    );
    const directives = String(response.headers['content-security-policy'])
      .split(';')
      .map((directive) => directive.trim());
    // Scripts are same-origin only, with no inline, eval, or attribute handlers.
    const named = (name: string) =>
      directives.filter((directive) => directive.split(' ')[0] === name);
    expect(named('script-src')).toEqual(["script-src 'self'"]);
    expect(named('script-src-attr')).toEqual(["script-src-attr 'none'"]);
    expect(directives).toContain('upgrade-insecure-requests');
  });

  it('serves the SPA shell for browser routes but never for API paths or missing assets', async () => {
    for (const route of ['/', '/signin', '/signup', '/app']) {
      const page = await api(testApp).get(route);
      expect(page.status).toBe(200);
      expect(page.text).toBe(SHELL);
      expect(page.headers['cache-control']).toBe('no-cache');
    }
    expect((await api(testApp).get('/assets/app.js')).status).toBe(200);
    expect((await api(testApp).get('/assets/missing.js')).status).toBe(404);
    const apiMiss = await api(testApp).get('/api/unknown');
    expect(apiMiss.status).toBe(404);
    expect(apiMiss.headers['content-type']).toContain('application/json');
  });

  it('keeps the status of a failed request for an existing asset', async () => {
    // Once the file exists, serve-static forwards range, precondition, and
    // read errors; only a missing asset is a 404.
    const range = await api(testApp)
      .get('/assets/app.js')
      .set('Range', 'bytes=999-');
    expect(range.status).toBe(416);
    expect(range.headers['content-range']).toBe('bytes */10');
    const precondition = await api(testApp)
      .get('/assets/app.js')
      .set('If-Match', '"stale"');
    expect(precondition.status).toBe(412);
  });

  it('never answers a differently cased API path with the SPA shell', async () => {
    // Express matches routes case-insensitively, so these are API requests.
    const unknown = await api(testApp).get('/API/unknown');
    expect(unknown.status).toBe(404);
    expect(unknown.headers['content-type']).toContain('application/json');
    const me = await api(testApp).get('/Api/auth/me');
    expect(me.status).toBe(401);
    expect(me.headers['content-type']).toContain('application/json');
  });
});
