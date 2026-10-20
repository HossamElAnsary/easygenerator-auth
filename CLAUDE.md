# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

AGENTS.md, imported above, is the shared agent guide: goal, document ownership, implementation rules, and the work/verification loop. Keep the import line. With Claude Code's default settings, AGENTS.md is not loaded on its own once a CLAUDE.md exists. This file adds the commands and code-level conventions that the planning documents leave implicit.

## Toolchain

- npm workspaces with one `package-lock.json`. Use `npm`, never pnpm or yarn.
- Node 24.22.0 (`.nvmrc`) and npm 12.2.0 are pinned exactly, and `.npmrc` sets `engine-strict`, so installs fail on any other version. Check `node --version` and `npm --version` before installing.
- Dependencies are exact (`save-exact`). TypeScript stays on 6.0.3 because the pinned typescript-eslint requires `<6.1`.
- npm 12 runs install scripts only for the exact versions allowed under `allowScripts` in the root `package.json` (Argon2, SWC). A new dependency with a native build step needs an entry there.

## Commands

First-time setup needs Docker: `npm ci`, `cp .env.example .env`, `docker compose up -d`, `npm run db:ready`. The last step is idempotent; it initializes or verifies the single-node replica set `easy-generator-rs` on `127.0.0.1:27018`.

- `npm run dev`: builds contracts and API, then watches contracts, the API (`127.0.0.1:3000`), and Vite (`127.0.0.1:5173`, proxying `/api`). It is long-running, so start it in the background.
- `npm run check:foundation`: the complete gate today (lint, format check, typecheck, all tests, build). Run it before claiming work is done. The planned `npm run check` and `npm run test:e2e` take over once they exist.
- `npm run lint`: ESLint plus `prettier --check .`, which also fails on unformatted Markdown; `npm run format` fixes it. The planning documents (`AGENTS.md`, `PLAN.md`, `AI.md`, `docs/plan/`) are deliberately Prettier-ignored, so preserve their layout by hand.
- `npm run typecheck`, `npm test`, `npm run build`: each builds `@easy-generator/contracts` first.
- `npm run build && npm run preview`: the compiled stack on `http://localhost:3000`, in development mode over loopback HTTP.

Single tests (arguments after `--` go to Vitest):

```sh
npm test -w @easy-generator/api -- test/config.test.ts -t 'secrets'
npm test -w @easy-generator/web -- src/App.test.tsx
npm test -w @easy-generator/contracts -- -t 'rejects'
```

- Workspace-level runs skip the contracts build. Both apps import `packages/contracts/dist`, so after editing contracts run `npm run build -w @easy-generator/contracts` (or keep `npm run dev` running).
- Run API tests through the npm script: it loads the root `.env`, which supplies `MONGODB_TEST_URI`, via `node --env-file-if-exists`. A plain `npx vitest` in `apps/api` does not. Database suites fail rather than skip when the replica set is unavailable.
- Inspect data with `docker compose exec mongodb mongosh --port 27018`. The project's mongod listens only on 27018, and a bare `mongosh` connects to 27017.

## How the code fits together

### API (`apps/api`: NestJS 12, ESM)

- `createApplication(config)` in `src/application.ts` is the composition root shared by `main.ts` and the integration tests. It sets the `/api` prefix and the global `StandardSchemaValidationPipe`, replaces Nest's body parser with a 16 KiB `express.json`, serves the built SPA when `SERVE_WEB=true` (never for `/api/*`), and awaits `DatabaseService.initialize()` before `app.init()`. Register global HTTP concerns there so the tests exercise them.
- `validateRuntimeConfig(process.env)` produces `RuntimeConfig`, which `AppModule.register(config)` provides under the `RUNTIME_CONFIG` symbol. `MONGODB_URI` must name a database other than `test` and a replica set (no `directConnection` or `loadBalanced`). It must also carry no read/write-concern, retry, or timeout parameters, because that policy is fixed in `src/database/database-options.ts`.
- The Mongoose connection is a bare `getConnectionToken()` provider. `DatabaseService` opens it with `autoIndex`, `autoCreate`, and `bufferCommands` off, so nothing is created implicitly and queries fail immediately while disconnected. Create and verify indexes in `StartupIndexes.verify()`, the awaited startup gate. Use `LINEARIZABLE_READ_OPTIONS` for session authorization reads.
- Validation attaches shared Zod schemas per parameter, as in `@Body({ schema: someSchema })`, and the global pipe enforces them (see `test/tooling.test.ts`). Do not add class-validator DTOs or a second rule set.
- Inject every constructor dependency with an explicit `@Inject(Token)`, as existing providers do. Without it, the `consistent-type-imports` lint autofix turns a class used only as a parameter type into `import type`. The emitted decorator metadata then holds `Object`, and dependency injection fails.
- Relative imports end in `.js` in `apps/api` and `packages/contracts` (NodeNext). In `apps/web` they have no extension (bundler resolution). Type-only imports use `import type` (`verbatimModuleSyntax`).
- Output is silent by design. Nest's logger is disabled, and startup and `db:ready` failures print one generic line. Keep it that way (Architecture A07): raw driver errors can contain connection strings. To diagnose, check the preconditions the message names: configuration, `npm run db:ready`, and built web assets when `SERVE_WEB=true`.
- Tests live in `test/**/*.test.ts`, compiled by SWC so decorator metadata is emitted, with `reflect-metadata` preloaded. Database tests use `isolatedDatabase()` from `test/test-database.ts`, which creates `easy_generator_test_<random>` and can drop only that database. Test-only controllers stay in `test/`, never `src/`.

### Web (`apps/web`: React 19, Vite)

- `src/main.tsx` creates the single `QueryClient` and the `BrowserRouter`. Requests use relative `/api` URLs with `credentials: 'same-origin'` and an abort/timeout signal, then decode the response with the shared schema (`src/health.ts`).
- Tests sit under `src/` and run in jsdom. They render with a fresh `QueryClient` (`retry: false`, `gcTime: 0`) and, for routed components, a `MemoryRouter`. They stub `fetch` with `vi.stubGlobal`, which the config restores after each test.
- The UI is English-only, with no i18n layer. User-facing copy is specified word for word in [Experience](docs/plan/experience.md) and Architecture, including R04's exact `Welcome to the application.` Adding locales or RTL is a scope change to record in Delivery first.
