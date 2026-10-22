import type { Page } from '@playwright/test';
import { test, expect } from './fixtures.js';

/** Expands an operation, runs it with its documented example, and returns the status shown. */
async function tryItOut(page: Page, operationId: string) {
  const operation = page.locator(`#operations-auth-${operationId}`);
  await operation.locator('.opblock-summary').click();
  await operation.getByRole('button', { name: 'Try it out' }).click();
  await operation.getByRole('button', { name: 'Execute' }).click();
  return operation.locator(
    '.live-responses-table .response-col_status:not(.col_header)',
  );
}

// The fixture fails the case on any Content-Security-Policy violation.
test('Swagger UI renders the document and runs signup → signin → me against the API', async ({
  page,
}) => {
  await page.goto('/api/docs');
  await expect(
    page.getByRole('heading', { name: /Easy Generator authentication API/ }),
  ).toBeVisible();
  for (const operationId of ['signup', 'signin', 'getCurrentUser', 'logout'])
    await expect(page.locator(`#operations-auth-${operationId}`)).toBeVisible();

  await expect(await tryItOut(page, 'signup')).toHaveText('201');
  await expect(await tryItOut(page, 'signin')).toHaveText('200');
  const me = await tryItOut(page, 'getCurrentUser');
  await expect(me).toHaveText('200');
  await expect(
    page
      .locator('#operations-auth-getCurrentUser .live-responses-table')
      .getByText('ada@example.com'),
  ).toBeVisible();
});
