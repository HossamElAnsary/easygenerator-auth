import { test, expect, account, headers } from './fixtures.js';

test('initial accessibility review: keyboard, labels, focus, responsive widths and enlarged content', async ({
  page,
}, testInfo) => {
  await page.goto('/signup');
  await expect(
    page.getByRole('heading', { name: 'Create an account' }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Name', { exact: true })).toHaveAttribute(
    'autocomplete',
    'name',
  );
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Email', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Email', { exact: true })).toHaveAttribute(
    'autocomplete',
    'username',
  );
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Password', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute(
    'autocomplete',
    'new-password',
  );
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Show password' }),
  ).toBeFocused();
  expect(
    await page
      .getByRole('button', { name: 'Show password' })
      .evaluate((button) => getComputedStyle(button).outlineStyle),
  ).toBe('solid');
  await page.keyboard.press('Space');
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute(
    'type',
    'text',
  );
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Name', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(
    page.getByLabel('Name', { exact: true }),
  ).toHaveAccessibleDescription('Enter your name.');
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`signup-${width}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 768, height: 800 });
  // CSS enlargement is a reflow probe, not a claim of native browser zoom certification.
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2';
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('signup-enlarged-200.png'),
    fullPage: true,
  });
  await page.evaluate(() => {
    document.documentElement.style.zoom = '';
  });
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeFocused();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute(
    'autocomplete',
    'current-password',
  );
  await page.screenshot({
    path: testInfo.outputPath('signin.png'),
    fullPage: true,
  });
  expect(
    (
      await page.request.post('/api/auth/signup', { headers, data: account })
    ).status(),
  ).toBe(201);
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Welcome to the application.' }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath('welcome.png'),
    fullPage: true,
  });
});
