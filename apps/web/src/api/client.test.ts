import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, authApi } from './client';

const user = { id: '1', name: 'Ada', email: 'ada@example.com' };
const response = (body: unknown, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers });
const failure = (code: string, fields?: Record<string, string[]>) => ({
  error: {
    code,
    message: 'Safe message',
    requestId: 'request-1',
    ...(fields ? { fields } : {}),
  },
});
afterEach(() => vi.useRealTimers());

describe('auth HTTP client', () => {
  it('uses relative URLs, same-origin cookies, required headers and exact credentials', async () => {
    const fetch = vi.fn().mockResolvedValue(response({ user }, 201));
    vi.stubGlobal('fetch', fetch);
    const input = { name: 'Ada', email: user.email, password: ' Exact-1 ' };
    expect(await authApi.signup(input)).toEqual(user);
    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/signup',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Protection': '1',
        },
        body: JSON.stringify(input),
        signal: expect.any(AbortSignal),
      }),
    );
  });
  it('accepts only the public user schema', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          response({ user: { ...user, passwordHash: 'secret' } }),
        ),
    );
    await expect(authApi.me()).rejects.toMatchObject({ kind: 'unavailable' });
  });
  it.each([
    [400, 'VALIDATION_ERROR', 'validation'],
    [401, 'INVALID_CREDENTIALS', 'credentials'],
    [401, 'UNAUTHENTICATED', 'unauthenticated'],
    [409, 'EMAIL_IN_USE', 'conflict'],
    [403, 'REQUEST_FORBIDDEN', 'request'],
    [503, 'SERVICE_UNAVAILABLE', 'unavailable'],
    [500, 'INTERNAL_ERROR', 'unavailable'],
  ])('decodes %s %s distinctly', async (status, code, kind) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          response(
            failure(
              code,
              code === 'VALIDATION_ERROR'
                ? { email: ['Enter a valid email address.'] }
                : undefined,
            ),
            status,
          ),
        ),
    );
    await expect(authApi.me()).rejects.toMatchObject({
      kind,
      code,
      requestId: 'request-1',
    });
  });
  it('never treats a non-401 response as confirmed anonymous', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response(failure('UNAUTHENTICATED'), 403)),
    );
    await expect(authApi.me()).rejects.toMatchObject({ kind: 'unavailable' });
  });
  it('keeps field errors and numeric Retry-After', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          response(failure('VALIDATION_ERROR', { email: ['Invalid'] }), 400),
        )
        .mockResolvedValueOnce(
          response(failure('RATE_LIMITED'), 429, { 'Retry-After': '37' }),
        ),
    );
    await expect(authApi.me()).rejects.toMatchObject({
      fields: { email: ['Invalid'] },
    });
    await expect(authApi.me()).rejects.toMatchObject({
      kind: 'rate-limit',
      retryAfter: 37,
    });
  });
  it('treats malformed HTTP errors and network failures as unavailable without retaining raw errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new Error('credential-marker'))
        .mockResolvedValueOnce(response({ unexpected: true }, 401)),
    );
    for (let i = 0; i < 2; i++) {
      try {
        await authApi.me();
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({ kind: 'unavailable' });
        expect(JSON.stringify(error)).not.toContain('credential-marker');
      }
    }
  });
  it('sends an empty logout object and handles 204 without parsing JSON', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    await expect(authApi.logout()).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({ body: '{}' }),
    );
  });
  it('aborts after 15 seconds with no retry', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(init.signal?.reason),
          );
        }),
    );
    vi.stubGlobal('fetch', fetch);
    const result = expect(authApi.me()).rejects.toMatchObject({
      kind: 'unavailable',
    });
    await vi.advanceTimersByTimeAsync(15_000);
    await result;
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('consumes Query cancellation even if transport finishes late', async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => {
        controller.abort();
        return response({ user });
      }),
    );
    await expect(authApi.me(controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
