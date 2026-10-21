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

First-time setup needs Docker: `npm ci`, `cp .env.example .env`, `docker compose up -d mongodb`, `npm run db:ready`. The last step is idempotent; it initializes or verifies the single-node replica set `easy-generator-rs` on `127.0.0.1:27018`.

- `npm run dev`: builds contracts and API, then watches contracts, the API (`127.0.0.1:3000`), and Vite (`127.0.0.1:5173`, proxying `/api`). It is long-running, so start it in the background.
- `npm run check`: the complete local executable gate (lint/format, strict typecheck, workspace tests, builds, real browser suite). Install Chromium first with `PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/ms-playwright" npx playwright install chromium`. Stop any dev/preview process on port 3000; browser cases own that port and isolated databases. `npm run test:e2e` builds and runs only browser cases; `check:foundation` excludes browsers. CI/release gates remain separate.
- `npm run lint`: ESLint plus `prettier --check .`, which also fails on unformatted Markdown; `npm run format` fixes it. The planning documents (`AGENTS.md`, `PLAN.md`, `AI.md`, `docs/plan/`) are deliberately Prettier-ignored, so preserve their layout by hand.
- `npm run typecheck`, `npm test`, `npm run build`: each builds `@easy-generator/contracts` first.
- `npm run build && npm run preview`: the compiled stack on `http://localhost:3000`, in development mode over loopback HTTP.
- `docker compose up --wait`: the whole application in containers at `http://localhost:8080`, needing no host Node (Architecture A12). It builds missing images; add `--build` after changing code. `app`, `proxy`, and `mongodb-init` share `mongodb`'s network namespace, so the API keeps its `127.0.0.1` listener and every port is declared on `mongodb`. It can run alongside `npm run check`: its API port 3000 is inside the namespace, not on the host.
- CI: `.github/workflows/ci.yml` runs the same steps on GitHub Actions (pinned Node/npm, Compose MongoDB plus `db:ready`, lint, typecheck, tests, `test:e2e`) with read-only permissions, plus a `docker` job that runs `docker compose up --wait` and a curl smoke test through the proxy. Keep it in step with `npm run check`, and pin actions to full commit SHAs.

Single tests (arguments after `--` go to Vitest):

```sh
npm test -w @easy-generator/api -- test/config.test.ts -t 'secrets'
npm test -w @easy-generator/web -- src/App.test.tsx
npm test -w @easy-generator/contracts -- -t 'rejects'
```

- Workspace-level runs skip the contracts build. Both apps import `packages/contracts/dist`, so after editing contracts run `npm run build -w @easy-generator/contracts` (or keep `npm run dev` running).
- Run API tests through the npm script: it loads the root `.env`, which supplies `MONGODB_TEST_URI`, via `node --env-file-if-exists`. A plain `npx vitest` in `apps/api` does not. Database suites fail rather than skip when the replica set is unavailable.
- Inspect data with `docker compose exec mongodb mongosh --port 27018`. The project's mongod listens only on 27018, and a bare `mongosh` connects to 27017.
- MongoDB is pinned to 7.0.45 on purpose: 8.0 exits at startup on Linux kernels 6.19 through 7.0.13 (SERVER-121912), including GitHub's `ubuntu-24.04` runners. Do not move to 8.x until a release starts there. The volume name carries the major version, because a server cannot open files from a newer one.
- `compose.yaml` fixes the project name (`easy-generator`) and host ports 27018 and 8080, so every checkout and worktree shares the same containers, image tags, and data volume. `docker/mongodb/Dockerfile` copies `scripts/mongo-init.js` into the image (no bind mount), so `--build` from any checkout replaces the shared images with that checkout's files (`docker compose --dry-run up` shows what would change). For a separate replica set, stop the default container and export one distinct `COMPOSE_PROJECT_NAME` for every command, `db:ready` included; a new name gets a fresh volume. Never run `docker compose down -v` on the default project.

## How the code fits together

### API (`apps/api`: NestJS 12, ESM)

- `startApplication()` in `src/application.ts` applies the whole HTTP pipeline for both `createApplication()` (production) and the test harness. Middleware order is deliberate: request context (server-side `X-Request-Id`, `no-store` on `/api`, one log line per API request), Helmet, mutation controls on `/api` (Origin, `X-CSRF-Protection: 1`, JSON; they run before any body is read), a 16 KiB uncompressed `express.json`, cookie parsing, then the built SPA when `SERVE_WEB=true` (never for `/api/*`). It awaits `DatabaseService.initialize()` before `app.init()`. Register global HTTP concerns there so the tests exercise them.
- Authentication is required by default: `ThrottlerGuard`, then `SessionGuard`, are global `APP_GUARD`s in `AppModule`. Exempt a handler only with the method-level `@Public()` (`src/auth/public.decorator.ts`), which skips the session check and nothing else. A new handler needs its access policy decided first (Architecture A09). Read the owner with `@CurrentUser()`, never from client input. Per-route limits use `@RateLimit()` from `src/http/rate-limits.ts`.
- Services throw the typed errors in `src/common/errors.ts`, never Nest `HttpException`s. `describeFailure()` in `src/http/api-failure.ts` is the single mapping to the A05 error shape. Wrap every database call in `withDatabase()` (`src/database/database-errors.ts`), so availability failures and lost acknowledgments become `503 SERVICE_UNAVAILABLE` rather than auth failures or false success.
- `AppLogger` (`src/core/app-logger.ts`) accepts only the fixed scalar fields of `LogRecord`. Never add a free-form payload; bodies, emails, passwords, hashes, tokens, cookies, and driver messages must stay out of logs.
- `validateRuntimeConfig(process.env)` produces `RuntimeConfig`, which `AppModule.register(config)` provides under the `RUNTIME_CONFIG` symbol. `MONGODB_URI` must name a database other than `test` and a replica set (no `directConnection` or `loadBalanced`). It must also carry no read-preference, read/write-concern, retry, or timeout parameters (including the deprecated `wtimeout` alias, which the driver lets override `wtimeoutMS`), because that policy is fixed in `src/database/database-options.ts`.
- The server listens on `LISTEN_HOST` (`127.0.0.1`) only. Outside production `APP_ORIGIN` must be a loopback host, because those modes issue cookies without `Secure`. Production requires `TRUST_PROXY` to cover `127.0.0.1`, the same-host reverse proxy; otherwise every client would share one rate-limit bucket.
- The Mongoose connection is a bare `getConnectionToken()` provider. `DatabaseService` opens it with `autoIndex`, `autoCreate`, and `bufferCommands` off, so nothing is created implicitly and queries fail immediately while disconnected. Create and verify indexes in `StartupIndexes.verify()`, the awaited startup gate. Use `LINEARIZABLE_READ_OPTIONS` for session authorization reads.
- Validation attaches shared Zod schemas per parameter, as in `@Body({ schema: someSchema })`, and the global pipe enforces them (see `test/tooling.test.ts`). Do not add class-validator DTOs or a second rule set.
- Inject every constructor dependency with an explicit `@Inject(Token)`, as existing providers do. Without it, the `consistent-type-imports` lint autofix turns a class used only as a parameter type into `import type`. The emitted decorator metadata then holds `Object`, and dependency injection fails.
- Relative imports end in `.js` in `apps/api` and `packages/contracts` (NodeNext). In `apps/web` they have no extension (bundler resolution). Type-only imports use `import type` (`verbatimModuleSyntax`).
- Output is silent by design. Nest's logger is disabled, and startup and `db:ready` failures print one generic line. Keep it that way (Architecture A07): raw driver errors can contain connection strings. To diagnose, check the preconditions the message names: configuration, `npm run db:ready`, built web assets when `SERVE_WEB=true`, and a free `PORT` (a dev, preview, or browser-test server may hold 3000).
- Tests live in `test/**/*.test.ts`, compiled by SWC so decorator metadata is emitted, with `reflect-metadata` preloaded. They allow 20 s per test and 30 s per hook, because in CI the workers and MongoDB share a few CPUs; the product's 5 s database budgets are separate. `startTestApp()` (`test/support/test-app.ts`) runs the real module and pipeline against a database from `isolatedDatabase()`, which creates `easy_generator_test_<random>` and can drop only that database. It substitutes a capturing logger and a controllable `TestClock`, and accepts provider overrides for fault injection.
- The harness trusts only the loopback proxy, and its `api()` helper gives every request its own `X-Forwarded-For` client, so rate limits stay enforced without tests sharing buckets. Pass a fixed client IP to test a limit itself. Test-only controllers (`test/support/probe.module.ts`) stay in `test/`, never `src/`.

### Web (`apps/web`: React 19, Vite)

- `src/main.tsx` creates the single `QueryClient` and the `BrowserRouter`. Requests use relative `/api` URLs with `credentials: 'same-origin'` and an abort/timeout signal, then decode the response with the shared schema (`src/api/client.ts`).
- `src/main.tsx` imports `./configure-zod` before anything else. Zod object schemas read the `jitless` flag when they are created, and its `new Function` probe would otherwise be reported as a CSP violation. The browser fixture fails every case that reports a CSP violation.
- Tests sit under `src/` and run in jsdom. They render with a fresh `QueryClient` (`retry: false`, `gcTime: 0`) and, for routed components, a `MemoryRouter`. They stub `fetch` with `vi.stubGlobal`, which the config restores after each test.
- The UI is English-only, with no i18n layer. User-facing copy is specified word for word in [Experience](docs/plan/experience.md) and Architecture, including R04's exact `Welcome to the application.` Adding locales or RTL is a scope change to record in Delivery first.

- The auth coordinator in `src/auth/AuthProvider.tsx` sequences credential actions and the credential-free logout mutation. `src/auth/session.ts` owns session query options and scope cleanup. Keep public forms mounted during background checks and never infer authentication from cached data while verification is pending/unavailable.
