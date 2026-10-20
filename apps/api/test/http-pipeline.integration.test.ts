import { gzipSync } from 'node:zlib';
import { apiErrorResponseSchema } from '@easy-generator/contracts';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ProbeModule, ProbeRecorder } from './support/probe.module.js';
import {
  api,
  clientIp,
  startTestApp,
  TEST_ORIGIN,
  type TestApp,
} from './support/test-app.js';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const LIMIT_BYTES = 16 * 1024;

/** A JSON object whose serialized form is exactly `bytes` long. */
function jsonOfLength(bytes: number): string {
  const empty = JSON.stringify({ padding: '' });
  return JSON.stringify({ padding: 'x'.repeat(bytes - empty.length) });
}

describe('HTTP pipeline', () => {
  let testApp: TestApp;
  let recorder: ProbeRecorder;

  beforeAll(async () => {
    testApp = await startTestApp({ imports: [ProbeModule] });
    recorder = testApp.app.get(ProbeRecorder);
  }, 20_000);

  afterAll(async () => {
    await testApp?.close();
  });

  beforeEach(() => {
    recorder.calls = 0;
  });

  /** fetch sends an untyped Blob without any Content-Type, unlike supertest. */
  async function rawPost(body: string, headers: Record<string, string>) {
    return fetch(`${await testApp.app.getUrl()}/api/test-probe/echo`, {
      method: 'POST',
      headers: { 'X-Forwarded-For': clientIp(), ...headers },
      body: new Blob([body]),
    });
  }

  function requestIdOf(response: { headers: Record<string, unknown> }): string {
    const id = response.headers['x-request-id'];
    if (typeof id !== 'string') throw new Error('Response has no request ID.');
    return id;
  }

  function expectError(
    response: {
      status: number;
      body: unknown;
      headers: Record<string, string>;
    },
    status: number,
    code: string,
    message: string,
  ) {
    expect(response.status).toBe(status);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(apiErrorResponseSchema.parse(response.body)).toEqual({
      error: { code, message, requestId: response.headers['x-request-id'] },
    });
  }

  it('issues its own request ID and disables caching on API responses', async () => {
    const response = await api(testApp)
      .get('/api/health')
      .set('X-Request-Id', 'client-chosen');
    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toMatch(UUID);
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('answers unknown API routes and methods with a safe JSON 404', async () => {
    const unknown = await api(testApp).get('/api/unknown-zxq');
    expectError(
      unknown,
      404,
      'NOT_FOUND',
      'The requested resource was not found.',
    );
    expect(unknown.text).not.toContain('zxq');

    const wrongMethod = await api(testApp).post('/api/health').send({});
    expectError(
      wrongMethod,
      404,
      'NOT_FOUND',
      'The requested resource was not found.',
    );
  });

  it('passes a same-origin JSON mutation with the custom header', async () => {
    const response = await api(testApp)
      .post('/api/test-probe/echo')
      .send({ value: 1 });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ received: { value: 1 } });
    expect(recorder.calls).toBe(1);
  });

  it.each([
    ['a missing Origin', { Origin: undefined }],
    ['another origin', { Origin: 'https://attacker.example' }],
    ['a null Origin', { Origin: 'null' }],
    ['a trailing-slash Origin', { Origin: `${TEST_ORIGIN}/` }],
    ['a missing custom header', { 'X-CSRF-Protection': undefined }],
    ['a wrong custom header', { 'X-CSRF-Protection': 'true' }],
  ])(
    'forbids a mutation with %s before running the handler',
    async (_case, headers) => {
      let call = api(testApp).post('/api/test-probe/echo');
      for (const [name, value] of Object.entries(headers)) {
        call = value === undefined ? call.unset(name) : call.set(name, value);
      }
      const response = await call.send({ value: 1 });
      expectError(
        response,
        403,
        'REQUEST_FORBIDDEN',
        'This request is not allowed.',
      );
      expect(recorder.calls).toBe(0);
    },
  );

  it.each([
    ['text/plain', 'text/plain'],
    ['form encoding', 'application/x-www-form-urlencoded'],
    ['JSON-like suffix types', 'application/merge-patch+json'],
  ])('rejects %s bodies with 415', async (_case, contentType) => {
    const response = await api(testApp)
      .post('/api/test-probe/echo')
      .set('Content-Type', contentType)
      .send('{"value":1}');
    expectError(
      response,
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      'Send the request body as JSON.',
    );
    expect(recorder.calls).toBe(0);
  });

  it('rejects a body without a Content-Type', async () => {
    const response = await rawPost('{"value":1}', {
      Origin: TEST_ORIGIN,
      'X-CSRF-Protection': '1',
    });
    expect(response.status).toBe(415);
    expect(recorder.calls).toBe(0);
  });

  it('rejects compressed request bodies instead of inflating them', async () => {
    const response = await api(testApp)
      .post('/api/test-probe/echo')
      .set('Content-Type', 'application/json')
      .set('Content-Encoding', 'gzip')
      .send(gzipSync('{"value":1}'));
    expectError(
      response,
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      'Send the request body as JSON.',
    );
    expect(recorder.calls).toBe(0);
  });

  it('accepts a 16 KiB JSON body and rejects one byte more', async () => {
    const atLimit = await api(testApp)
      .post('/api/test-probe/echo')
      .set('Content-Type', 'application/json')
      .send(jsonOfLength(LIMIT_BYTES));
    expect(atLimit.status).toBe(201);

    const overLimit = await api(testApp)
      .post('/api/test-probe/echo')
      .set('Content-Type', 'application/json')
      .send(jsonOfLength(LIMIT_BYTES + 1));
    expectError(
      overLimit,
      413,
      'PAYLOAD_TOO_LARGE',
      'The request body is too large.',
    );
    expect(recorder.calls).toBe(1);
  });

  it('checks origin before reading an oversized body', async () => {
    const response = await api(testApp)
      .post('/api/test-probe/echo')
      .set('Origin', 'https://attacker.example')
      .set('Content-Type', 'application/json')
      .send(jsonOfLength(LIMIT_BYTES * 4));
    expectError(
      response,
      403,
      'REQUEST_FORBIDDEN',
      'This request is not allowed.',
    );
  });

  it.each([
    ['malformed JSON', '{"value": 1,'],
    ['a JSON null body', 'null'],
    ['a JSON string body', '"text"'],
  ])('rejects %s with a generic validation error', async (_case, body) => {
    const response = await api(testApp)
      .post('/api/test-probe/echo')
      .set('Content-Type', 'application/json')
      .send(body);
    expectError(
      response,
      400,
      'VALIDATION_ERROR',
      'The request body is invalid.',
    );
    expect(response.text).not.toMatch(/position|token|JSON\.parse/i);
    expect(recorder.calls).toBe(0);
  });

  it.each([
    ['signin', '/api/auth/signin', `${'['.repeat(8000)}${']'.repeat(8000)}`],
    [
      'logout',
      '/api/auth/logout',
      `{"a":${'['.repeat(8000)}${']'.repeat(8000)}}`,
    ],
  ])(
    'rejects deeply nested JSON within the size limit on %s as invalid input',
    async (_route, path, body) => {
      expect(body.length).toBeLessThanOrEqual(LIMIT_BYTES);
      const response = await api(testApp)
        .post(path)
        .set('Content-Type', 'application/json')
        .send(body);
      expectError(
        response,
        400,
        'VALIDATION_ERROR',
        'The request body is invalid.',
      );
      const records = testApp.logger.records.filter(
        ({ requestId }) => requestId === requestIdOf(response),
      );
      expect(records.map(({ event }) => event)).toEqual(['http_request']);
    },
  );

  it.each(['put', 'patch', 'delete'] as const)(
    'applies the mutation controls to %s requests',
    async (method) => {
      const agent = request(testApp.app.getHttpServer());
      const call = () => agent[method]('/api/test-probe/echo');
      const unprotected = await call()
        .set('X-Forwarded-For', clientIp())
        .send({ value: 1 });
      expect(unprotected.status).toBe(403);
      const controlled = await call()
        .set('Origin', testApp.origin)
        .set('X-CSRF-Protection', '1')
        .set('X-Forwarded-For', clientIp())
        .send({ value: 1 });
      // Past the controls, no handler exists for this method.
      expect(controlled.status).toBe(404);
      expect(recorder.calls).toBe(0);
    },
  );

  it('treats any letter case of /api as the API', async () => {
    const response = await api(testApp).get('/API/health');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(
      testApp.logger.records.some(
        ({ requestId }) => requestId === requestIdOf(response),
      ),
    ).toBe(true);
  });

  it('sends security headers suited to local HTTP', async () => {
    const response = await api(testApp).get('/api/health');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    const policy = String(response.headers['content-security-policy']);
    expect(policy).toContain("script-src 'self'");
    expect(policy).toContain("frame-ancestors 'self'");
    expect(policy).not.toContain('upgrade-insecure-requests');
    expect(response.headers['strict-transport-security']).toBeUndefined();
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('logs one safe record per API request, including rejections', async () => {
    const accepted = await api(testApp)
      .post('/api/test-probe/echo')
      .send({ value: 1 });
    const rejected = await api(testApp)
      .post('/api/test-probe/echo')
      .unset('Origin')
      .send({ value: 1 });
    const recordFor = (id: string) =>
      testApp.logger.records.filter((record) => record.requestId === id);

    expect(recordFor(requestIdOf(accepted))).toEqual([
      expect.objectContaining({
        event: 'http_request',
        method: 'POST',
        route: '/api/test-probe/echo',
        status: 201,
        durationMs: expect.any(Number),
      }),
    ]);
    expect(recordFor(requestIdOf(rejected))).toEqual([
      expect.objectContaining({
        event: 'http_request',
        method: 'POST',
        route: null,
        status: 403,
        code: 'REQUEST_FORBIDDEN',
      }),
    ]);
  });
});
