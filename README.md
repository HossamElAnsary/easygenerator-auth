# Easy Generator authentication task

Implementation currently covers **M1 — Foundation** of [baseline v1.2](PLAN.md): a React/TypeScript workspace, NestJS API, shared Zod readiness contract, and MongoDB startup/readiness checks. Authentication and the required welcome page are scheduled for M2/M3 and are not implemented yet. See [Delivery](docs/plan/delivery.md) and [Verification](docs/plan/verification.md) for actual progress and evidence.

## Prerequisites and versions

- Node **24.22.0**, pinned in `.nvmrc` and `.node-version`; npm **12.2.0**, pinned in `package.json`.
- Docker with Compose v2 for the local single-node MongoDB replica set. No globally installed Nest CLI or MongoDB is required.
- Free loopback ports 3000 (API), 5173 (Vite), and 27018 (MongoDB).

Compose pins MongoDB **8.0.32** and its multi-platform image digest. Port 27018 avoids the existing MongoDB service on this workstation; the container also advertises `localhost:27018` so host-side replica-set discovery works. npm 12 install-script permissions are version-scoped for SWC and Argon2; the optional fsevents install script remains disabled. The lockfile install and native-addon smoke were verified on macOS arm64.

Use your Node version manager to install/select the pinned version (`nvm install && nvm use` for nvm), then `npm install --global npm@12.2.0` if needed. Check `node --version` and `npm --version` before installing. Strict engine checks intentionally reject another runtime.

Exact dependencies and the single `package-lock.json` pin Nest **12.2.0**, Nest/Mongoose adapter **12.0.0**, Mongoose **9.11.2**, React **19.3.1**, Vite **8.3.4**, Zod **4.6.7**, React Hook Form **7.90.0**, its resolvers **6.0.0**, TanStack Query **5.104.5**, TypeScript **6.0.3**, and Vitest **5.0.5**. TypeScript 6 is deliberate: the pinned TypeScript ESLint tools do not support TypeScript 7. Nest's generated ESM scaffold was inspected, then adapted to workspaces; SWC preserves decorator metadata for DI tests.

Compatibility references: [Nest migration/tooling](https://docs.nestjs.com/migration-guide), [Vite runtime requirements](https://vite.dev/guide/), and package `engines`/`peerDependencies` from the npm registry. Installation and executable smoke checks are the evidence; planning choices alone are not.

## Local development

```sh
npm ci
cp .env.example .env
docker compose up -d
npm run db:ready
npm run dev
```

Open `http://localhost:5173`. The minimal foundation page calls `/api/health` through Vite's proxy. It shows readiness only; it does not simulate signup or authentication. The API listens on loopback port 3000 and reports only `{"status":"ok"}` or a safe 503 `{"status":"unavailable"}`. The development command builds shared contracts and the API first, then watches contracts/API/web. Stop it with Ctrl-C. `docker compose stop` stops MongoDB while retaining the project volume.

The example database is local and unauthenticated, published on loopback only. It has one replica-set member and provides no redundancy. This is not a public database deployment. Do not reuse its configuration for production. The readiness initializer is restricted to this project's local/test setup; it never reconfigures an existing set. Keep the same advertised host/port when using the provided Compose configuration so the host application can discover the primary.

## Commands available in M1

| Command                    | Purpose                                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                   | Install exactly the lockfile                                                                                         |
| `npm run db:ready`         | Initialize the known local set if needed; verify a writable primary                                                  |
| `npm run dev`              | Watch contracts, API, and web in dependency order                                                                    |
| `npm run lint`             | ESLint (including React Hooks) and formatting checks; no edits                                                       |
| `npm run format`           | Format implementation/configuration files                                                                            |
| `npm run typecheck`        | Strict checking of all workspaces and tests                                                                          |
| `npm test`                 | Contract, Nest/validation/native-addon, frontend integration, configuration, and isolated database foundation checks |
| `npm run build`            | Build contracts, API, then web                                                                                       |
| `npm run preview`          | Run the compiled stack locally on `http://localhost:3000`                                                            |
| `npm run start:prod`       | Run compiled assets with validated production configuration                                                          |
| `npm run check:foundation` | Run the checks available in M1                                                                                       |

The full `check` command and `test:e2e` are deferred until the real browser journeys exist. CI is M4. A foundation pass is not an authentication or release pass.

Tests require the running replica set and `MONGODB_TEST_URI` from `.env.example`; missing database prerequisites fail the suite instead of silently skipping integration checks. The marker database must be named `easy_generator_test` and differ from the application database. Each run creates `easy_generator_test_<random UUID>` and can drop only that exact owned database. The four web tests use jsdom and mocked HTTP; the API/database tests use real Nest HTTP listeners and MongoDB. No real-browser journey is claimed in M1.

## Configuration and safety boundaries

Use `.env.example` as the reference. Real `.env` files, local source briefs, dependencies, generated output, logs, database files, and test artifacts are ignored. Never put `MONGODB_URI` or credentials in `VITE_*` settings.

| Setting            | Purpose                                                            |
| ------------------ | ------------------------------------------------------------------ |
| `NODE_ENV`         | `development`, `test`, or `production`                             |
| `PORT`             | API port, default 3000                                             |
| `MONGODB_URI`      | Required database URI with replica-set discovery                   |
| `APP_ORIGIN`       | Exact public origin without path; production requires HTTPS        |
| `SERVE_WEB`        | `false` with Vite; `true` for built preview/production             |
| `TRUST_PROXY`      | Off by default; explicit ingress address/subnet only               |
| `MONGODB_TEST_URI` | Dedicated test URI; generated test databases keep cleanup isolated |

Startup validates configuration and required assets, connects to a writable replica-set primary, and awaits an index-verification hook before listening. Actual user/session indexes belong to M2. Database policy uses primary/majority reads, majority and journal-acknowledged writes (5-second write concern budget), 5-second server selection/read budgets, and a 10-second socket timeout. The foundation checks exercise a bounded linearizable read on a uniquely keyed disposable record; authorization semantics still belong to M2.

`npm run build && npm run preview` uses development mode over loopback HTTP. Production requires an external replica set and an HTTPS reverse proxy for the configured origin; explicit trusted ingress configuration and preventing direct public API access remain deployment responsibilities. No hosted HTTPS, failover, backup, authentication cookie, or production security claim is made by this milestone.

## Structure and next work

- `apps/web`: minimal React readiness screen and library integration smoke tests.
- `apps/api`: Nest health/config/database foundation and tests.
- `packages/contracts`: browser/server-neutral strict Zod readiness schema.
- `docs/plan`: owned contracts, milestone state, and acceptance evidence.
- `AI.md`: actual assistance and corrections.

M2 adds validated signup/signin, user/session persistence and indexes, password hashing, request controls, protected `/api/auth/me`, logout, and direct API tests. M3 adds the browser authentication journey. Read [AGENTS.md](AGENTS.md) before changing the baseline.
