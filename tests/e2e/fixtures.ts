import { test as base, expect } from '@playwright/test';
import { isolatedDatabase } from '../../apps/api/test/test-database.js';
import { validateRuntimeConfig } from '../../apps/api/src/config/runtime-config.js';

// Load compiled Nest code: Playwright's TS transform does not emit DI metadata.
const { createApplication } = (await import(
  new URL('../../apps/api/dist/application.js', import.meta.url).href
)) as typeof import('../../apps/api/src/application.js');

const { Clock } = (await import(
  new URL('../../apps/api/dist/core/clock.js', import.meta.url).href
)) as typeof import('../../apps/api/src/core/clock.js');

type Database = ReturnType<typeof isolatedDatabase>;
export const test = base.extend<{
  database: Database;
  server: { advanceClock(milliseconds: number): void };
  contentSecurityPolicy: void;
}>({
  // The served CSP has no 'unsafe-eval'. A blocked attempt is still reported,
  // even when the page catches the error, so every case asserts there are none.
  contentSecurityPolicy: [
    async ({ context }, use) => {
      const violations: string[] = [];
      await context.exposeBinding('reportCspViolation', (_source, violation) =>
        violations.push(String(violation)),
      );
      await context.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (event) => {
          const report = (
            window as unknown as {
              reportCspViolation(violation: string): Promise<void>;
            }
          ).reportCspViolation;
          void report(`${event.effectiveDirective} ${event.blockedURI}`);
        });
      });
      await use();
      expect(violations, 'Content Security Policy violations').toEqual([]);
    },
    { auto: true },
  ],
  // Playwright inspects destructured fixture dependencies.
  // eslint-disable-next-line no-empty-pattern
  database: async ({}, use) => {
    const database = isolatedDatabase();
    await database.client.connect();
    try {
      await use(database);
    } finally {
      await database.cleanup();
    }
  },
  server: [
    async ({ database }, use) => {
      const app = await createApplication(
        validateRuntimeConfig({
          NODE_ENV: 'test',
          MONGODB_URI: database.uri,
          APP_ORIGIN: 'http://localhost:3000',
          SERVE_WEB: 'true',
          PORT: '3000',
        }),
      );
      try {
        // A fresh real server per case also gives independent, fully enforced rate counters.
        await app.listen(3000, '127.0.0.1');
        let offset = 0;
        app.get(Clock).now = () => new Date(Date.now() + offset);
        await use({
          advanceClock: (milliseconds) => {
            offset += milliseconds;
          },
        });
      } finally {
        await app.close();
      }
    },
    { auto: true },
  ],
});
export { expect };
export const headers = {
  Origin: 'http://localhost:3000',
  'X-CSRF-Protection': '1',
  'Content-Type': 'application/json',
};
export const account = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  password: ' Analytical-1 ',
};
