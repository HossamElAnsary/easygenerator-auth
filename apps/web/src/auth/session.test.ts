import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, authApi } from '../api/client';
import { sessionOptions, sessionKey } from './session';

const user = { id: '1', name: 'Ada', email: 'ada@example.com' };
describe('session query', () => {
  it('caches only the public user or null on a confirmed 401, clearing scoped data', async () => {
    const client = new QueryClient();
    vi.spyOn(authApi, 'me')
      .mockResolvedValueOnce(user)
      .mockRejectedValueOnce(new ApiError('unauthenticated'));
    await expect(client.fetchQuery(sessionOptions(client))).resolves.toEqual(
      user,
    );
    client.setQueryData(['private'], { secret: true });
    await expect(client.fetchQuery(sessionOptions(client))).resolves.toBeNull();
    expect(client.getQueryData(['private'])).toBeUndefined();
    expect(client.getQueryData(sessionKey)).toBeNull();
    client.clear();
  });
  it('retains unverified data on outage and never retries', async () => {
    const client = new QueryClient();
    client.setQueryData(sessionKey, user);
    const me = vi
      .spyOn(authApi, 'me')
      .mockRejectedValue(new ApiError('unavailable'));
    await expect(
      client.fetchQuery(sessionOptions(client)),
    ).rejects.toMatchObject({ kind: 'unavailable' });
    expect(client.getQueryState(sessionKey)?.status).toBe('error');
    expect(client.getQueryData(sessionKey)).toEqual(user);
    expect(me).toHaveBeenCalledTimes(1);
    client.clear();
  });
});
