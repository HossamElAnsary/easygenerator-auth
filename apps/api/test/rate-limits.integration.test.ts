import { apiErrorResponseSchema } from '@easy-generator/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ProbeModule } from './support/probe.module.js';
import {
  api,
  clientIp,
  startTestApp,
  type TestApp,
} from './support/test-app.js';

const DEFAULT_LIMIT = 120;

async function exhaust(
  send: () => PromiseLike<{ status: number }>,
  count: number,
) {
  for (let request = 0; request < count; request += 1) {
    expect((await send()).status).not.toBe(429);
  }
}

function expectRateLimited(response: {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}) {
  expect(response.status).toBe(429);
  expect(apiErrorResponseSchema.parse(response.body).error).toMatchObject({
    code: 'RATE_LIMITED',
    message: 'Too many requests. Try again later.',
  });
  const retryAfter = Number(response.headers['retry-after']);
  expect(retryAfter).toBeGreaterThan(0);
  expect(retryAfter).toBeLessThanOrEqual(60);
}

describe('rate limits with a trusted loopback proxy', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await startTestApp({ imports: [ProbeModule] });
  }, 20_000);

  afterAll(async () => {
    await testApp?.close();
  });

  it('allows 120 requests per route and client each minute, then returns 429', async () => {
    const client = clientIp();
    await exhaust(() => api(testApp).get('/api/health', client), DEFAULT_LIMIT);
    expectRateLimited(await api(testApp).get('/api/health', client));

    // Other clients and other routes keep their own counters.
    expect((await api(testApp).get('/api/health')).status).toBe(200);
    const otherRoute = await api(testApp)
      .post('/api/test-probe/echo', client)
      .send({});
    expect(otherRoute.status).toBe(201);
  });
});

describe('rate limits without proxy trust', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await startTestApp({ env: { TRUST_PROXY: 'false' } });
  }, 20_000);

  afterAll(async () => {
    await testApp?.close();
  });

  it('ignores spoofed X-Forwarded-For values when counting', async () => {
    // Each call uses a different forwarded address; the socket address is the same.
    await exhaust(() => api(testApp).get('/api/health'), DEFAULT_LIMIT);
    expectRateLimited(await api(testApp).get('/api/health'));
  });
});
