import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthProvider';
import { authApi, ApiError } from '../api/client';
import { sessionKey } from './session';

const user = { id: '1', name: 'Ada', email: 'ada@example.com' };
function Probe() {
  const auth = useAuth();
  return (
    <>
      <p>{auth.status}</p>
      <button onClick={() => void auth.logout()}>Logout</button>
    </>
  );
}
describe('coordinator race boundaries', () => {
  it('cancels a stale successful check before logout and blocks focus checks during the mutation', async () => {
    let finishCheck!: (value: typeof user) => void;
    const stale = new Promise<typeof user>((resolve) => {
      finishCheck = resolve;
    });
    let finishLogout!: () => void;
    const pending = new Promise<void>((resolve) => {
      finishLogout = resolve;
    });
    const me = vi
      .spyOn(authApi, 'me')
      .mockResolvedValueOnce(user)
      .mockReturnValueOnce(stale)
      .mockRejectedValue(new ApiError('unauthenticated'));
    vi.spyOn(authApi, 'logout').mockReturnValue(pending);
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/app']}>
          <AuthProvider>
            <Probe />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await screen.findByText('authenticated');
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    await screen.findByText('checking');
    const signal = me.mock.calls[1]?.[0];
    await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
    expect(signal?.aborted).toBe(true);
    const before = me.mock.calls.length;
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    expect(me.mock.calls.length).toBe(before);
    await act(async () => finishLogout());
    await screen.findByText('anonymous');
    await act(async () => finishCheck(user));
    await waitFor(() => expect(client.getQueryData(sessionKey)).toBeNull());
    expect(screen.getByText('anonymous')).toBeTruthy();
    client.clear();
    focusManager.setFocused(undefined);
  });
});
