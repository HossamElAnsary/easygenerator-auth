import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { authApi, ApiError } from './api/client';
import { sessionKey } from './auth/session';
import { ErrorBoundary } from './ui/ErrorBoundary';

const user = { id: '1', name: 'Ada', email: 'ada@example.com' };
const password = ' Exact-1 ';
const anonymous = () => Promise.reject(new ApiError('unauthenticated'));
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const clients: QueryClient[] = [];
afterEach(() => {
  clients.forEach((client) => client.clear());
  clients.length = 0;
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
});
function renderApp(
  path = '/signin',
  client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } }),
) {
  clients.push(client);
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}
async function fillSignin(value = password) {
  await screen.findByRole('heading', { name: 'Sign in' });
  await userEvent.type(screen.getByLabelText('Email'), 'ADA@example.com');
  await userEvent.type(screen.getByLabelText('Password'), value);
}
async function focus() {
  await act(async () => {
    focusManager.setFocused(false);
    focusManager.setFocused(true);
  });
}

describe('browser auth state', () => {
  it('protects direct application access without a signin flash during bootstrap', async () => {
    const pending = deferred<typeof user>();
    vi.spyOn(authApi, 'me').mockReturnValue(pending.promise);
    renderApp('/app');
    expect(screen.getByText('Checking your session…')).toBeTruthy();
    expect(screen.queryByRole('heading')).toBeNull();
    await act(async () => pending.reject(new ApiError('unauthenticated')));
    expect(
      await screen.findByRole('heading', { name: 'Sign in' }),
    ).toBeTruthy();
  });
  it('shows no public form before the first session answer, then redirects an authenticated visitor', async () => {
    const pending = deferred<typeof user>();
    vi.spyOn(authApi, 'me').mockReturnValue(pending.promise);
    renderApp('/signin');
    expect(screen.getByText('Checking your session…')).toBeTruthy();
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByLabelText('Email')).toBeNull();
    await act(async () => pending.resolve(user));
    expect(
      await screen.findByRole('heading', {
        name: 'Welcome to the application.',
      }),
    ).toBeTruthy();
  });
  it('disables sign-out and says so while logout is pending', async () => {
    vi.spyOn(authApi, 'me').mockResolvedValue(user);
    const pending = deferred<undefined>();
    vi.spyOn(authApi, 'logout').mockReturnValue(pending.promise);
    renderApp('/app');
    await screen.findByText('Welcome to the application.');
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(
      screen
        .getByRole('button', { name: 'Signing out…' })
        .hasAttribute('disabled'),
    ).toBe(true);
    await act(async () => pending.resolve(undefined));
  });
  it('awaits signin, prevents duplicate actions, normalizes email, preserves password and keeps caches credential-free', async () => {
    const me = vi.spyOn(authApi, 'me').mockImplementation(anonymous);
    const pending = deferred<typeof user>();
    const signin = vi.spyOn(authApi, 'signin').mockReturnValue(pending.promise);
    const client = renderApp();
    await fillSignin();
    await userEvent.dblClick(screen.getByRole('button', { name: 'Sign in' }));
    expect(
      screen
        .getByRole('button', { name: 'Signing in…' })
        .hasAttribute('disabled'),
    ).toBe(true);
    expect(signin).toHaveBeenCalledTimes(1);
    expect(signin).toHaveBeenCalledWith({ email: user.email, password });
    me.mockResolvedValue(user);
    await act(async () => pending.resolve(user));
    expect(
      await screen.findByRole('heading', {
        name: 'Welcome to the application.',
      }),
    ).toBeTruthy();
    expect(
      JSON.stringify(
        client
          .getQueryCache()
          .getAll()
          .map((q) => q.state),
      ),
    ).not.toContain(password);
    expect(client.getMutationCache().getAll()).toHaveLength(0);
  });
  it('focus checks deduplicate, preserve mounted fields, show outage and recover', async () => {
    const me = vi.spyOn(authApi, 'me').mockImplementation(anonymous);
    renderApp();
    await fillSignin();
    const field = screen.getByLabelText('Password');
    const pending = deferred<typeof user>();
    me.mockReturnValue(pending.promise);
    const before = me.mock.calls.length;
    await focus();
    await focus();
    expect(me.mock.calls.length).toBe(before + 1);
    expect(screen.getByLabelText('Password')).toBe(field);
    await act(async () => pending.reject(new ApiError('unavailable')));
    expect(
      await screen.findByText("We couldn't check your session. Try again."),
    ).toBeTruthy();
    expect((field as HTMLInputElement).value).toBe(password);
    me.mockImplementation(anonymous);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() =>
      expect(
        screen.queryByText("We couldn't check your session. Try again."),
      ).toBeNull(),
    );
    expect(screen.getByLabelText('Password')).toBe(field);
  });
  it('withholds cached protected content during checks and outages; 401 shows expiry and clears scoped data', async () => {
    const me = vi.spyOn(authApi, 'me').mockResolvedValue(user);
    const client = renderApp('/app');
    await screen.findByRole('heading', { name: 'Welcome to the application.' });
    client.setQueryData(['private'], { owner: user.id });
    const pending = deferred<typeof user>();
    me.mockReturnValue(pending.promise);
    await focus();
    await waitFor(() =>
      expect(screen.queryByText('Welcome to the application.')).toBeNull(),
    );
    await act(async () => pending.reject(new ApiError('unavailable')));
    await screen.findByText("We couldn't check your session. Try again.");
    expect(client.getQueryData(sessionKey)).toEqual(user);
    expect(screen.queryByLabelText('Email')).toBeNull();
    me.mockImplementation(anonymous);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(
      await screen.findByText(
        'Your session has expired. Please sign in again.',
      ),
    ).toBeTruthy();
    expect(client.getQueryData(['private'])).toBeUndefined();
  });
  it('ignores an old session response after successful signin', async () => {
    const me = vi.spyOn(authApi, 'me').mockImplementation(anonymous);
    const signin = vi.spyOn(authApi, 'signin').mockResolvedValue(user);
    const client = renderApp();
    await fillSignin();
    const stale = deferred<typeof user>();
    me.mockReturnValueOnce(stale.promise).mockResolvedValue(user);
    await focus();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByText('Welcome to the application.');
    await act(async () => stale.reject(new ApiError('unauthenticated')));
    expect(client.getQueryData(sessionKey)).toEqual(user);
    expect(signin).toHaveBeenCalledTimes(1);
  });
  it('does not claim logout on failure, and successful logout clears scoped cache', async () => {
    const me = vi.spyOn(authApi, 'me').mockResolvedValue(user);
    const logout = vi
      .spyOn(authApi, 'logout')
      .mockRejectedValueOnce(new ApiError('unavailable'))
      .mockResolvedValue(undefined);
    const client = renderApp('/app');
    await screen.findByText('Welcome to the application.');
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(
      await screen.findByText('The service is unavailable. Try again.'),
    ).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe(
      'The service is unavailable. Try again.',
    );
    expect(screen.getByText('Welcome to the application.')).toBeTruthy();
    client.setQueryData(['private'], user);
    me.mockImplementation(anonymous);
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await screen.findByRole('heading', { name: 'Sign in' });
    expect(client.getQueryData(['private'])).toBeUndefined();
    expect(client.getQueryData(sessionKey)).toBeNull();
    expect(logout).toHaveBeenCalledTimes(2);
    expect(
      client
        .getMutationCache()
        .getAll()
        .every((m) => m.state.variables === undefined),
    ).toBe(true);
  });
  it('keeps a logout failure visible through the session recheck that follows it', async () => {
    const me = vi.spyOn(authApi, 'me').mockResolvedValue(user);
    vi.spyOn(authApi, 'logout').mockRejectedValue(new ApiError('unavailable'));
    renderApp('/app');
    await screen.findByText('Welcome to the application.');
    const check = deferred<typeof user>();
    me.mockReturnValue(check.promise);
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await screen.findByText('Checking your session…');
    expect(screen.queryByText('Welcome to the application.')).toBeNull();
    await act(async () => check.resolve(user));
    await screen.findByText('Welcome to the application.');
    expect(screen.getByRole('alert').textContent).toBe(
      'The service is unavailable. Try again.',
    );
  });
  it('settles offline checks and submissions without queuing a POST on reconnect', async () => {
    vi.spyOn(authApi, 'me').mockImplementation(anonymous);
    const signin = vi
      .spyOn(authApi, 'signin')
      .mockRejectedValue(new ApiError('unavailable'));
    renderApp();
    await fillSignin();
    onlineManager.setOnline(false);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByText('The service is unavailable. Try again.');
    await act(async () => onlineManager.setOnline(true));
    expect(signin).toHaveBeenCalledTimes(1);
  });
  it('announces request errors as alerts and names the password toggle only by its action', async () => {
    vi.spyOn(authApi, 'me').mockImplementation(anonymous);
    vi.spyOn(authApi, 'signin').mockRejectedValue(
      new ApiError('credentials', {
        message: 'Email or password is incorrect.',
        code: 'INVALID_CREDENTIALS',
      }),
    );
    renderApp();
    await fillSignin();
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle.hasAttribute('aria-pressed')).toBe(false);
    await userEvent.click(toggle);
    expect(
      screen
        .getByRole('button', { name: 'Hide password' })
        .hasAttribute('aria-pressed'),
    ).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Email or password is incorrect.',
    );
  });
  it('maps server errors, focuses first invalid field, and clears errors on correction', async () => {
    vi.spyOn(authApi, 'me').mockImplementation(anonymous);
    vi.spyOn(authApi, 'signin').mockRejectedValue(
      new ApiError('validation', {
        message: 'Please check the highlighted fields.',
        code: 'VALIDATION_ERROR',
        fields: { email: ['Server email error.'] },
      }),
    );
    renderApp();
    await fillSignin('x');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByText('Server email error.');
    expect(document.activeElement).toBe(screen.getByLabelText('Email'));
    await userEvent.type(screen.getByLabelText('Email'), 'm');
    await waitFor(() =>
      expect(screen.queryByText('Server email error.')).toBeNull(),
    );
  });
  it('validates shared signup policy and sends normalized values with Unicode password unchanged', async () => {
    vi.spyOn(authApi, 'me').mockImplementation(anonymous);
    const signup = vi.spyOn(authApi, 'signup').mockResolvedValue(user);
    renderApp('/signup');
    await screen.findByRole('heading', { name: 'Create an account' });
    await userEvent.click(
      screen.getByRole('button', { name: 'Create an account' }),
    );
    expect(await screen.findByText('Enter your name.')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText('Name'));
    await userEvent.type(screen.getByLabelText('Name'), '  Ada  ');
    await userEvent.type(screen.getByLabelText('Email'), 'ADA@EXAMPLE.COM');
    await userEvent.type(screen.getByLabelText('Password'), ' 字١!abc😀 ');
    await userEvent.click(
      screen.getByRole('button', { name: 'Create an account' }),
    );
    expect(
      await screen.findByText('Account created. Sign in to continue.'),
    ).toBeTruthy();
    expect(signup).toHaveBeenCalledWith({
      name: 'Ada',
      email: user.email,
      password: ' 字١!abc😀 ',
    });
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe(
      user.email,
    );
    expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe(
      '',
    );
  });

  it('does not promote an unverified cached user while signin is pending', async () => {
    const client = new QueryClient();
    client.setQueryData(sessionKey, user);
    vi.spyOn(authApi, 'me').mockRejectedValue(new ApiError('unavailable'));
    const pending = deferred<typeof user>();
    vi.spyOn(authApi, 'signin').mockReturnValue(pending.promise);
    renderApp('/signin', client);
    await screen.findByText("We couldn't check your session. Try again.");
    await fillSignin();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.queryByText('Welcome to the application.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Retry' }).hasAttribute('disabled'),
    ).toBe(true);
    await act(async () => pending.reject(new ApiError('unavailable')));
    await screen.findByText('The service is unavailable. Try again.');
    expect(screen.queryByText('Welcome to the application.')).toBeNull();
  });

  it.each([
    ['name', '😀'.repeat(101), 'Name must be at most 100 characters.'],
    [
      'password',
      'A1!' + '😀'.repeat(126),
      'Password must be at most 128 characters.',
    ],
    ['password', '字١!😀😀😀😀', 'Password must be at least 8 characters.'],
    [
      'email',
      'a'.repeat(250) + '@x.com',
      'Email must be at most 254 characters.',
    ],
  ])('applies shared browser bounds for %s', async (field, value, message) => {
    vi.spyOn(authApi, 'me').mockImplementation(anonymous);
    const signup = vi.spyOn(authApi, 'signup');
    renderApp('/signup');
    await screen.findByRole('heading', { name: 'Create an account' });
    for (const [id, input] of Object.entries({
      name: 'Ada',
      email: user.email,
      password,
      [field]: value,
    })) {
      fireEvent.change(document.getElementById(id)!, {
        target: { value: input },
      });
    }
    await userEvent.click(
      screen.getByRole('button', { name: 'Create an account' }),
    );
    expect(await screen.findByText(message)).toBeTruthy();
    expect(signup).not.toHaveBeenCalled();
  });
  it('honors the rate-limit wait through input correction and requires manual resubmission', async () => {
    vi.spyOn(authApi, 'me').mockImplementation(anonymous);
    // Built per call, as the client builds one per response: retryAt starts then.
    const signin = vi.spyOn(authApi, 'signin').mockImplementation(() =>
      Promise.reject(
        new ApiError('rate-limit', {
          message: 'Too many requests.',
          code: 'RATE_LIMITED',
          retryAfter: 1,
        }),
      ),
    );
    renderApp();
    await fillSignin();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByText('Too many requests. Try again in 1 second.');
    await userEvent.type(screen.getByLabelText('Password'), 'x');
    expect(
      screen.getByRole('button', { name: 'Sign in' }).hasAttribute('disabled'),
    ).toBe(true);
    await waitFor(
      () =>
        expect(
          screen
            .getByRole('button', { name: 'Sign in' })
            .hasAttribute('disabled'),
        ).toBe(false),
      { timeout: 2000 },
    );
    expect(signin).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(signin).toHaveBeenCalledTimes(2);
  });
  it('honors Retry-After on session verification before offering Retry', async () => {
    vi.spyOn(authApi, 'me')
      .mockImplementationOnce(() =>
        Promise.reject(
          new ApiError('rate-limit', {
            message: 'Too many requests.',
            code: 'RATE_LIMITED',
            retryAfter: 1,
          }),
        ),
      )
      .mockImplementation(anonymous);
    renderApp();
    await screen.findByText('Too many requests. Try again in 1 second.');
    expect(
      screen.getByRole('button', { name: 'Retry' }).hasAttribute('disabled'),
    ).toBe(true);
    await waitFor(
      () =>
        expect(
          screen
            .getByRole('button', { name: 'Retry' })
            .hasAttribute('disabled'),
        ).toBe(false),
      { timeout: 2000 },
    );
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByRole('heading', { name: 'Sign in' });
  });
  it('resolves the home route and redirects an authenticated visitor away from signup', async () => {
    vi.spyOn(authApi, 'me').mockResolvedValue(user);
    renderApp('/signup');
    await screen.findByRole('heading', { name: 'Welcome to the application.' });
    expect(screen.queryByLabelText('Email')).toBeNull();
  });
  it('provides a not-found page with a working home link', async () => {
    vi.spyOn(authApi, 'me').mockImplementation(anonymous);
    renderApp('/missing');
    await screen.findByRole('heading', { name: 'Page not found' });
    await userEvent.click(screen.getByRole('link', { name: 'Return home' }));
    await screen.findByRole('heading', { name: 'Sign in' });
  });
  it('renders a recoverable boundary without exposing the thrown error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    function Broken(): never {
      throw new Error('secret-marker');
    }
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeTruthy();
    expect(screen.queryByText('secret-marker')).toBeNull();
  });
});
