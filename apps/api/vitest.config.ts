import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    swc.vite({
      jsc: {
        target: 'es2023',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  test: {
    environment: 'node',
    // Unit tests sit beside their sources; integration suites live in test/.
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    // Cases drive the real app: Argon2 hashing plus journaled majority writes
    // to MongoDB. Where test workers and the database share a few CPUs, as on
    // a CI runner, a correct case can outlast Vitest's 5 s default; the
    // product's own 5 s database budgets are unchanged.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
