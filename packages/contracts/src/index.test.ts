import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from './index.js';

describe('public health response', () => {
  it.each(['ok', 'unavailable'])('accepts %s readiness', (status) => {
    expect(healthResponseSchema.parse({ status })).toEqual({ status });
  });

  it.each([
    {},
    null,
    { status: 'starting' },
    { status: 'ok', connectionString: 'internal details' },
  ])('rejects malformed or extra response data', (response) => {
    expect(healthResponseSchema.safeParse(response).success).toBe(false);
  });
});
