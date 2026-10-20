import type { Page } from '@playwright/test';
import { test, expect, headers, account } from './fixtures.js';

async function signin(page: Page) {
  await page.goto('/signin');
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', {
      name: 'Welcome to the application.',
      exact: true,
    }),
  ).toBeVisible();
}
async function seed(page: Page) {
  expect(
    (
      await page.request.post('/api/auth/signup', { headers, data: account })
    ).status(),
  ).toBe(201);
}
const outage = {
  error: {
    code: 'SERVICE_UNAVAILABLE',
    message: 'The service is unavailable. Try again.',
    requestId: 'browser-test',
  },
};

test('real signup → signin → welcome → refresh → logout, direct guards and revoked replay', async ({
  page,
  context,
}) => {
  await page.goto('/app');
  await expect(page).toHaveURL('/signin');
  await page.getByRole('link', { name: 'Create an account' }).click();
  await page.getByLabel('Name', { exact: true }).fill('  Ada Lovelace  ');
  await page.getByLabel('Email', { exact: true }).fill('ADA@EXAMPLE.COM');
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page
    .getByRole('button', { name: 'Create an account', exact: true })
    .click();
  await expect(
    page.getByText('Account created. Sign in to continue.'),
  ).toBeVisible();
  expect(await context.cookies()).toEqual([]);
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(
    account.email,
  );
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading')).toHaveText(
    'Welcome to the application.',
  );
  const cookie = (await context.cookies()).find(
    (value) => value.name === 'session',
  );
  expect(cookie?.httpOnly).toBe(true);
  expect(
    await page.evaluate(() => ({
      local: { ...localStorage },
      session: { ...sessionStorage },
      cookie: document.cookie,
    })),
  ).toEqual({ local: {}, session: {}, cookie: '' });
  await page.reload();
  await expect(page.getByRole('heading')).toHaveText(
    'Welcome to the application.',
  );
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/signin');
  await page.goto('/app');
  await expect(page).toHaveURL('/signin');
  const replay = await page.request.get('/api/auth/me', {
    headers: { Cookie: `session=${cookie?.value}` },
  });
  expect(replay.status()).toBe(401);
});

test('shared validation, Unicode boundaries, focus, password visibility and signup conflict', async ({
  page,
}) => {
  await page.goto('/signup');
  await page
    .getByRole('button', { name: 'Create an account', exact: true })
    .click();
  await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
  await page.getByLabel('Email', { exact: true }).fill('bad');
  await page.getByLabel('Password', { exact: true }).fill('abc12345 ');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue(
    'abc12345 ',
  );
  await page.getByLabel('Name', { exact: true }).fill('😀😀');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue(
    'abc12345 ',
  );
  await page
    .getByRole('button', { name: 'Create an account', exact: true })
    .click();
  await expect(
    page.getByText('Name must be at least 3 characters.'),
  ).toBeVisible();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await expect(
    page.getByText('Password must include a special character.'),
  ).toBeVisible();
  await page.getByLabel('Name', { exact: true }).fill('😀😀😀');
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(' 字١!abc😀 ');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute(
    'type',
    'text',
  );
  await expect(
    page.getByRole('button', { name: 'Hide password' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page
    .getByRole('button', { name: 'Create an account', exact: true })
    .click();
  await expect(page).toHaveURL('/signin');
  await page.getByRole('link', { name: 'Create an account' }).click();
  await page.getByLabel('Name', { exact: true }).fill(account.name);
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page
    .getByRole('button', { name: 'Create an account', exact: true })
    .click();
  await expect(
    page.getByText('An account with this email already exists.'),
  ).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue(
    account.password,
  );
});

test('invalid credentials use the generic error even for a short password', async ({
  page,
}) => {
  await seed(page);
  await page.goto('/signin');
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill('x');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Email or password is incorrect.')).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('x');
});

test('session outage withholds protected content and Retry restores identity; logout failure stays signed in', async ({
  page,
}) => {
  await seed(page);
  await signin(page);
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ status: 503, json: outage }),
  );
  await page.reload();
  await expect(
    page.getByText("We couldn't check your session. Try again."),
  ).toBeVisible();
  await expect(page.getByText('Welcome to the application.')).toHaveCount(0);
  await page.unroute('**/api/auth/me');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText('Welcome to the application.')).toBeVisible();
  await page.route('**/api/auth/logout', (route) =>
    route.fulfill({ status: 503, json: outage }),
  );
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(
    page.getByText('The service is unavailable. Try again.'),
  ).toBeVisible();
  await expect(page.getByText('Welcome to the application.')).toBeVisible();
  await page.unroute('**/api/auth/logout');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/signin');
});

test('expiry before TTL cleanup is detected on navigation without exposing cached content', async ({
  page,
  server,
  database,
}) => {
  await seed(page);
  await signin(page);
  server.advanceClock(24 * 60 * 60 * 1000);
  // The real TTL clock has not advanced: the expired session must still be stored.
  expect(
    await database.client.db().collection('sessions').countDocuments(),
  ).toBe(1);
  // A history transition rechecks within the mounted application, retaining the expiry notice.
  await page.evaluate(() => {
    history.pushState({}, '', '/signup');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(
    page.getByText('Your session has expired. Please sign in again.'),
  ).toBeVisible();
  await expect(page.getByText('Welcome to the application.')).toHaveCount(0);
});

test('real signup limit is enforced and Retry-After is presented', async ({
  page,
}) => {
  for (let i = 0; i < 5; i++) {
    expect(
      (
        await page.request.post('/api/auth/signup', { headers, data: {} })
      ).status(),
    ).toBe(400);
  }
  await page.goto('/signup');
  await page.getByLabel('Name', { exact: true }).fill(account.name);
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  const responsePromise = page.waitForResponse('**/api/auth/signup');
  await page
    .getByRole('button', { name: 'Create an account', exact: true })
    .click();
  const response = await responsePromise;
  expect(response.status()).toBe(429);
  const seconds = Number(response.headers()['retry-after']);
  expect(seconds).toBeGreaterThan(0);
  await expect(
    page.getByText(`Too many requests. Try again in ${seconds} seconds.`),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Create an account', exact: true }),
  ).toBeDisabled();
});

test('offline POST fails without replay and session retry works after reconnect', async ({
  page,
  context,
}) => {
  await seed(page);
  await page.goto('/signin');
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  let posts = 0;
  page.on('request', (request) => {
    if (request.url().endsWith('/auth/signin')) posts++;
  });
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByText('The service is unavailable. Try again.'),
  ).toBeVisible();
  await expect(
    page.getByText("We couldn't check your session. Try again."),
  ).toBeVisible();
  await context.setOffline(false);
  await expect(
    page.getByText("We couldn't check your session. Try again."),
  ).toHaveCount(0);
  expect(posts).toBe(1);
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue(
    account.password,
  );
});

test('background checks preserve public forms and a delayed 401 cannot undo newer signin', async ({
  page,
}) => {
  await seed(page);
  await page.goto('/signin');
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let intercepted!: () => void;
  const started = new Promise<void>((resolve) => {
    intercepted = resolve;
  });
  await page.route(
    '**/api/auth/me',
    async (route) => {
      intercepted();
      await held;
      await route.fulfill({
        status: 401,
        json: {
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Sign in to continue.',
            requestId: 'late-check',
          },
        },
      });
    },
    { times: 1 },
  );
  await page.evaluate(() =>
    window.dispatchEvent(new Event('visibilitychange')),
  );
  await started;
  await expect(page.getByText('Checking your session…')).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue(
    account.password,
  );
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Welcome to the application.')).toBeVisible();
  release();
  // A navigation check after the obsolete response also proves the new cookie survived.
  await page.evaluate(() => {
    history.pushState({ key: 'post-stale' }, '', '/signup');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page).toHaveURL('/app');
  await expect(page.getByText('Welcome to the application.')).toBeVisible();
});

test('navigation from a mounted public form observes signin in another tab', async ({
  page,
  context,
}) => {
  await seed(page);
  await page.goto('/signup');
  await page.getByLabel('Name', { exact: true }).fill('Unfinished name');
  const other = await context.newPage();
  await signin(other);
  await other.close();
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/app');
  await expect(page.getByText('Welcome to the application.')).toBeVisible();
});
