import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { API_DOCUMENT } from '../src/modules/api-docs/api-docs.document.js';
import {
  DEFAULT_RATE_LIMIT,
  LOGOUT_RATE_LIMIT,
  SIGNIN_RATE_LIMIT,
  SIGNUP_RATE_LIMIT,
} from '../src/http/rate-limits.js';
import { api, startTestApp, type TestApp } from './support/test-app.js';

const COMMITTED_DOCUMENT = new URL(
  '../../../docs/openapi.json',
  import.meta.url,
);
const DOCS_ROUTES = /^\/api\/(docs(\/|$)|openapi\.json$)/;
const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'patch'];

interface RouterLayer {
  route?: { path: string; methods: Record<string, boolean> };
}

/** Every `METHOD /path` the application registered with Express. */
function registeredRoutes(testApp: TestApp): string[] {
  // Express's types do not describe its router's layer stack, which is the
  // only record of the routes Nest registered.
  const express = testApp.app.getHttpAdapter().getInstance() as unknown as {
    router: { stack: RouterLayer[] };
  };
  return express.router.stack.flatMap(({ route }) =>
    route
      ? Object.keys(route.methods).map(
          (method) => `${method.toUpperCase()} ${route.path}`,
        )
      : [],
  );
}

function documentedRoutes(): string[] {
  const paths = API_DOCUMENT.paths as Record<string, Record<string, unknown>>;
  return Object.entries(paths).flatMap(([path, item]) =>
    Object.keys(item)
      .filter((key) => HTTP_METHODS.includes(key))
      .map((method) => `${method.toUpperCase()} ${path}`),
  );
}

describe('API documentation outside production', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await startTestApp();
  });

  afterAll(async () => {
    await testApp?.close();
  });

  it('documents exactly the routes the application serves', () => {
    const served = registeredRoutes(testApp).filter(
      (route) => !DOCS_ROUTES.test(route.split(' ')[1] ?? ''),
    );
    expect(served.length).toBeGreaterThan(0);
    expect(documentedRoutes().sort()).toEqual(served.sort());
  });

  it('serves the document without a session', async () => {
    const response = await api(testApp).get('/api/openapi.json');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(response.body).toEqual(API_DOCUMENT);
  });

  it('matches the committed docs/openapi.json (regenerate with npm run docs:openapi)', async () => {
    const committed: unknown = JSON.parse(
      await readFile(COMMITTED_DOCUMENT, 'utf8'),
    );
    expect(committed).toEqual(API_DOCUMENT);
  });

  it('states the rate limits the routes enforce', () => {
    const description = String(
      (API_DOCUMENT.info as Record<string, unknown>).description,
    );
    for (const limit of [
      SIGNUP_RATE_LIMIT,
      SIGNIN_RATE_LIMIT,
      LOGOUT_RATE_LIMIT,
      DEFAULT_RATE_LIMIT,
    ])
      expect(description).toContain(`${limit} per minute`);
  });

  it('serves the Swagger UI page and its files with the security headers', async () => {
    const page = await api(testApp).get('/api/docs');
    expect(page.status).toBe(200);
    expect(page.headers['content-type']).toMatch(/^text\/html/);
    expect(page.headers['content-security-policy']).toContain(
      "script-src 'self'",
    );
    expect(page.text).toContain('/api/docs/swagger-initializer.js');

    for (const [path, type] of [
      ['/api/docs/swagger-initializer.js', /^text\/javascript/],
      ['/api/docs/swagger-ui.css', /^text\/css/],
      ['/api/docs/swagger-ui-bundle.js', /^text\/javascript/],
      ['/api/docs/favicon-32x32.png', /^image\/png/],
    ] as const) {
      const response = await api(testApp).get(path);
      expect(response.status, path).toBe(200);
      expect(response.headers['content-type'], path).toMatch(type);
    }
  });

  it('points Swagger UI at this document, with no remote validator', async () => {
    const script = await api(testApp).get('/api/docs/swagger-initializer.js');
    expect(script.text).toContain("url: '/api/openapi.json'");
    expect(script.text).toContain('validatorUrl: null');
  });

  it.each([
    '/api/docs/index.html',
    '/api/docs/swagger-initializer.js.map',
    '/api/docs/swagger-ui-bundle.js.map',
    '/api/docs/oauth2-redirect.html',
  ])('serves no other file from the package (%s)', async (path) => {
    const response = await api(testApp).get(path);
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });
});

describe('API documentation in production', () => {
  let testApp: TestApp;
  let webDirectory: string;

  beforeAll(async () => {
    // Production serves the web app, so it needs a stand-in shell to start.
    webDirectory = await mkdtemp(join(tmpdir(), 'easy-generator-web-'));
    await writeFile(join(webDirectory, 'index.html'), '<!doctype html>');
    testApp = await startTestApp({
      env: {
        NODE_ENV: 'production',
        APP_ORIGIN: 'https://app.example.test',
        SERVE_WEB: 'true',
      },
      webDirectory,
    });
  });

  afterAll(async () => {
    await testApp?.close();
    if (webDirectory) await rm(webDirectory, { recursive: true, force: true });
  });

  it.each(['/api/openapi.json', '/api/docs', '/api/docs/swagger-ui-bundle.js'])(
    'is not served (%s)',
    async (path) => {
      const response = await api(testApp).get(path);
      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
    },
  );
});
