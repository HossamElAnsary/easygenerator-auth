import { describe, expect, it } from 'vitest';
import { apiErrorResponseSchema } from './index.js';

describe('API error response', () => {
  // Every code documented in Architecture A05, written out independently.
  it.each([
    'VALIDATION_ERROR',
    'INVALID_CREDENTIALS',
    'UNAUTHENTICATED',
    'REQUEST_FORBIDDEN',
    'NOT_FOUND',
    'EMAIL_IN_USE',
    'PAYLOAD_TOO_LARGE',
    'UNSUPPORTED_MEDIA_TYPE',
    'RATE_LIMITED',
    'SERVICE_UNAVAILABLE',
    'INTERNAL_ERROR',
  ])('accepts the documented code %s', (code) => {
    const body = {
      error: { code, message: 'Safe message.', requestId: 'id-1' },
    };
    expect(apiErrorResponseSchema.parse(body)).toEqual(body);
  });

  it('accepts field errors and rejects undocumented codes or extra data', () => {
    const fields = { email: ['Enter a valid email address.'] };
    expect(
      apiErrorResponseSchema.parse({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please check the highlighted fields.',
          fields,
          requestId: 'id-2',
        },
      }).error.fields,
    ).toEqual(fields);
    for (const error of [
      { code: 'TEAPOT', message: 'x', requestId: 'id-3' },
      { code: 'INTERNAL_ERROR', message: 'x', requestId: 'id-4', stack: 'x' },
    ]) {
      expect(apiErrorResponseSchema.safeParse({ error }).success).toBe(false);
    }
  });
});
