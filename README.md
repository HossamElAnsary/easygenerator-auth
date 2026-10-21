# Easy Generator authentication task

Implementation covers **M1 — Foundation** through **M5 — Submission ready** of [baseline v1.2](PLAN.md). Visitors can create an account, sign in, see exactly `Welcome to the application.`, restore their session on refresh, and sign out. The React/TypeScript UI uses the NestJS API and MongoDB-backed HttpOnly sessions. See [Delivery](docs/plan/delivery.md) and [Verification](docs/plan/verification.md) for the evidence and remaining gates. This README was followed from a clean clone at M5, and the GitHub Actions workflow passes; publication and the recruiter handoff remain M6.

## Prerequisites and versions

- Node **24.22.0**, pinned in `.nvmrc` and `.node-version`; npm **12.2.0**, pinned in `package.json`.
- Docker with Compose v2 for the local single-node MongoDB replica set. No globally installed Nest CLI or MongoDB is required.
- Free loopback ports 3000 (API), 5173 (Vite), and 27018 (MongoDB).

Compose pins MongoDB **8.0.32** and its multi-platform image digest. It publishes port 27018 instead of the default 27017, so it does not collide with another local MongoDB; the container also advertises `localhost:27018` so host-side replica-set discovery works. npm 12 install-script permissions are version-scoped for SWC and Argon2; the optional fsevents install script remains disabled. The locked install and native addons are verified on macOS arm64 locally and on Linux x64 in CI.

Use your Node version manager to install and select the pinned version (`nvm install && nvm use` for nvm). Node 24.22.0 bundles npm 11.19.1, so then run `npm install --global npm@12.2.0`, which upgrades npm for that Node installation only. Check `node --version` and `npm --version` before installing dependencies: strict engine checks intentionally reject another runtime, and `npm ci` with the bundled npm stops with `EBADENGINE`.

Exact dependencies and the single `package-lock.json` pin Nest **12.2.0**, Nest/Mongoose adapter **12.0.0**, Mongoose **9.11.2**, React **19.3.1**, Vite **8.3.4**, Zod **4.6.7**, React Hook Form **7.90.0**, its resolvers **6.0.0**, TanStack Query **5.104.5**, TypeScript **6.0.3**, Vitest **5.0.5**, Helmet **8.3.0**, cookie-parser **1.4.7**, and `@nestjs/throttler` **6.7.1** (which declares Nest 12 support). TypeScript 6 is deliberate: the pinned TypeScript ESLint tools do not support TypeScript 7. Nest's generated ESM scaffold was inspected, then adapted to workspaces; SWC preserves decorator metadata for DI tests.

Compatibility references: [Nest migration/tooling](https://docs.nestjs.com/migration-guide), [Vite runtime requirements](https://vite.dev/guide/), and package `engines`/`peerDependencies` from the npm registry. Installation and executable smoke checks are the evidence; planning choices alone are not.

## Local development

```sh
npm ci
cp .env.example .env
docker compose up -d
npm run db:ready
npm run dev
```

Open **`http://localhost:5173`** (exactly this host, not `127.0.0.1`). Vite's startup banner prints `http://127.0.0.1:5173/`, the address it listens on; use `localhost` anyway. On `127.0.0.1` the pages load, but every form submission fails with `This request is not allowed.`, because the browser's `Origin` then differs from `APP_ORIGIN`. The home route resolves the session and redirects to signin or the application; signup is linked from signin. Vite proxies relative `/api` requests without changing the browser Origin. The API listens on loopback port 3000, behind the same proxy, and logs one JSON line per API request (request ID, method, route template, status, duration, error code). The development command builds shared contracts and the API first, then watches contracts/API/web. Stop it with Ctrl-C. `docker compose stop` stops MongoDB while retaining the project volume.

The example database is local and unauthenticated, published on loopback only. It has one replica-set member and provides no redundancy. This is not a public database deployment. Do not reuse its configuration for production. The readiness initializer is restricted to this project's local/test setup; it never reconfigures an existing set. Keep the same advertised host/port when using the provided Compose configuration so the host application can discover the primary.

## Commands

| Command                    | Purpose                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm ci`                   | Install exactly the lockfile                                                                           |
| `npm run db:ready`         | Initialize the known local set if needed; verify a writable primary                                    |
| `npm run dev`              | Watch contracts, API, and web in dependency order                                                      |
| `npm run lint`             | ESLint (including React Hooks) and formatting checks; no edits                                         |
| `npm run format`           | Format implementation/configuration files                                                              |
| `npm run typecheck`        | Strict checking of all workspaces and tests                                                            |
| `npm test`                 | Shared-schema boundaries, API integration against isolated MongoDB, configuration, and web integration |
| `npm run build`            | Build contracts, API, then web                                                                         |
| `npm run preview`          | Run the compiled stack locally on `http://localhost:3000`                                              |
| `npm run start:prod`       | Run compiled assets with validated production configuration                                            |
| `npm run test:e2e`         | Build and run the isolated real Chromium suite                                                         |
| `npm run check`            | Complete local executable gate, including browser tests and builds                                     |
| `npm run check:foundation` | Run lint, typecheck, workspace tests, and build (excludes browsers)                                    |

`npm run test:e2e` builds the compiled stack, then runs pinned Playwright **1.64.1** with Chromium. `npm run check` runs lint/format, strict typecheck (including browser tests), workspace tests, and `test:e2e` (including builds).

Install the pinned browser once after `npm ci`, from the repository root:

```sh
PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/ms-playwright" npx playwright install chromium
npm run test:e2e
# Complete local executable gate:
npm run check
```

The download stays in ignored `.cache/ms-playwright` (Playwright 1.64.1's Chromium, build 1248), not a temporary tool directory. On Linux, install Playwright's required OS libraries using its `install --with-deps chromium` option when needed.

Stop the development/preview server before browser tests: the suite owns loopback port **3000** and refuses to reuse another process. Each case starts the compiled real API and serves the compiled UI at **`http://localhost:3000`** in test mode, with that exact `APP_ORIGIN`, its own generated test database, and fresh production rate-limit counters. One worker runs the cases sequentially; retries are disabled. A dedicated case exercises the real signup limit and `Retry-After`. No rate-limit override, forwarding-header spoofing, or development-database cleanup is used. Normal teardown closes the owned server and drops only the case's owned database. A forcibly killed process may leave its generated test database; never broadly delete application data to clean up tests. Screenshots and failure reports stay under ignored `test-results/`.

Tests require the running replica set and `MONGODB_TEST_URI` from `.env.example`; missing database prerequisites fail the suite instead of silently skipping integration checks. The marker database must be named `easy_generator_test` and differ from the application database. Each test application creates `easy_generator_test_<random UUID>` and can drop only that exact owned database. API tests drive the real Nest HTTP pipeline and MongoDB; driver faults are injected only to test failure paths, using the driver's own error types. Web tests use jsdom and mocked HTTP. Browser tests in `tests/e2e` run the real compiled API/SPA; route interception is limited to deliberate outage/race cases. They reuse the validated isolated-database helper. The e2e fixture imports compiled Nest code because Playwright's TypeScript transform does not emit Nest DI metadata.

To run one test file or a subset by name, pass Vitest arguments after `--`, for example `npm test -w @easy-generator/api -- test/signin.integration.test.ts -t 'fresh token'`. Workspace-level runs skip the contracts build, so run `npm run build -w @easy-generator/contracts` first after changing `packages/contracts`.

Every browser case also fails if the page reports a Content Security Policy violation. The served CSP has no `'unsafe-eval'`, so the web entry imports `configure-zod.ts` first to run Zod without its `new Function` fast path.

### Continuous integration

`.github/workflows/ci.yml` runs the same gate on GitHub Actions for pushes to `main`, pull requests, and manual runs. It selects Node from `.nvmrc` and npm 12.2.0 (both asserted), starts the Compose MongoDB, installs with `npm ci`, initializes the replica set with `npm run db:ready`, then runs `npm run lint`, `npm run typecheck`, `npm test`, installs Chromium with its OS packages, and runs `npm run test:e2e` (production build plus browser journey). The job has read-only repository permissions, does not persist the checkout token, uses no secrets, and deploys nothing. Actions are pinned to full commit SHAs. Because the database tools print one generic line on failure, a failed job also prints the MongoDB container's state and recent logs. Verification records the local replays and the first remote runs.

## Authentication API

All routes are under `/api`. Every API response sends `Cache-Control: no-store` and a server-generated `X-Request-Id`.

| Method and path         | Request body                      | Success                                   | Route-specific failures                                     |
| ----------------------- | --------------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| `POST /api/auth/signup` | `{ "name", "email", "password" }` | `201 { "user" }`; creates no session      | `400 VALIDATION_ERROR`, `409 EMAIL_IN_USE`                  |
| `POST /api/auth/signin` | `{ "email", "password" }`         | `200 { "user" }` and a new session cookie | `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`           |
| `GET /api/auth/me`      | none; send the session cookie     | `200 { "user" }`                          | `401 UNAUTHENTICATED`                                       |
| `POST /api/auth/logout` | `{}`; session cookie optional     | `204`, cookie expired                     | `503 SERVICE_UNAVAILABLE` if revocation cannot be confirmed |
| `GET /api/health`       | none                              | `200 { "status": "ok" }`                  | `503 { "status": "unavailable" }`                           |

`user` is always exactly `{ "id", "email", "name" }`. The shared schemas in `packages/contracts` define validation for browser and server alike: email is trimmed and lowercased (dots and `+` tags are kept) and is at most 254 characters; name is trimmed, 3–100 characters; the signup password is 8–128 characters with at least one letter, decimal digit, and punctuation or symbol character, and is never trimmed or normalized. Lengths count Unicode code points. Signin accepts any nonempty password up to 128 characters, so a password that fails signup rules gets the generic credential error rather than a policy message.

**Request controls.** Every POST must send `Origin` exactly equal to `APP_ORIGIN`, `X-CSRF-Protection: 1`, and an uncompressed `Content-Type: application/json` body of at most 16 KiB; otherwise the response is `403 REQUEST_FORBIDDEN`, `415 UNSUPPORTED_MEDIA_TYPE`, or `413 PAYLOAD_TOO_LARGE`, and the handler never runs. CORS is disabled. Browsers send `Origin` themselves; other clients must set it.

**Sessions.** Signin issues an opaque 256-bit token in an `HttpOnly`, `SameSite=Lax`, `Path=/` cookie. It is named `session` for local HTTP and `__Host-session` with `Secure` in production. A session lasts exactly 24 hours from signin, with no renewal, and MongoDB stores only its SHA-256 hash. Expiry is enforced on every lookup, not left to TTL cleanup. `GET /api/auth/me` never sets or clears cookies. Logout revokes only the presented session, is idempotent, and expires the cookie only after the deletion is confirmed.

**Errors.** Every failure uses `{ "error": { "code", "message", "fields"?, "requestId" } }`, where `fields` appears only for field validation errors. The codes are `VALIDATION_ERROR`, `INVALID_CREDENTIALS`, `UNAUTHENTICATED`, `REQUEST_FORBIDDEN`, `NOT_FOUND`, `EMAIL_IN_USE`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE`, and `INTERNAL_ERROR`. Messages never echo input. Unknown API routes return the JSON 404, never the SPA page.

**Rate limits.** Per route and client IP per minute: signup 5, signin 10, logout 30, every other route 120. A `429` includes `Retry-After` in seconds. Counters live in memory, reset on restart, and are not shared across processes. `X-Forwarded-For` is ignored unless `TRUST_PROXY` names the proxy that sets it.

Example for bash or zsh against `npm run dev`, with dummy credentials. Signup prints the new user, signin and `me` print the same user, logout prints `204`, and the last request prints a `401` error because the session was revoked. A repeated run gets `409 EMAIL_IN_USE` from signup and then continues.

```sh
ORIGIN=http://localhost:5173
JAR=$(mktemp)
JSON=(-H "Origin: $ORIGIN" -H 'X-CSRF-Protection: 1' -H 'Content-Type: application/json')
curl -s -w '\n' "${JSON[@]}" -d '{"name":"Ada Lovelace","email":"ada@example.com","password":"Analytical-1"}' "$ORIGIN/api/auth/signup"
curl -s -w '\n' -c "$JAR" "${JSON[@]}" -d '{"email":"ada@example.com","password":"Analytical-1"}' "$ORIGIN/api/auth/signin"
curl -s -w '\n' -b "$JAR" "$ORIGIN/api/auth/me"
curl -s -b "$JAR" -c "$JAR" -o /dev/null -w '%{http_code}\n' "${JSON[@]}" -d '{}' "$ORIGIN/api/auth/logout"
curl -s -w '\n' -b "$JAR" "$ORIGIN/api/auth/me"
```

## Configuration and safety boundaries

Use `.env.example` as the reference. Real `.env` files, local source briefs, dependencies, generated output, logs, database files, and test artifacts are ignored. Never put `MONGODB_URI` or credentials in `VITE_*` settings.

| Setting            | Purpose                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`         | `development`, `test`, or `production`                                                                      |
| `PORT`             | API port, default 3000                                                                                      |
| `MONGODB_URI`      | Required database URI with replica-set discovery and no concern, read-preference, retry, or timeout options |
| `APP_ORIGIN`       | Exact origin without path: a loopback host outside production, HTTPS in production                          |
| `SERVE_WEB`        | `false` with Vite; `true` for built preview/production                                                      |
| `TRUST_PROXY`      | Off by default; production must include `127.0.0.1`, the same-host proxy, and may add upstream hops         |
| `MONGODB_TEST_URI` | Dedicated test URI; generated test databases keep cleanup isolated                                          |

Startup validates configuration and required assets, connects to a writable replica-set primary, then creates and verifies the unique `users.email`, unique `sessions.tokenHash`, and TTL `sessions.expiresAt` indexes before listening. Existing indexes are never dropped; a conflicting definition stops startup. Database policy uses primary/majority reads, majority and journal-acknowledged writes (5-second write concern budget), 5-second server selection/read budgets, and a 10-second socket timeout. Session checks use a primary linearizable read bounded to 5 seconds, which costs about 0.1 s per authenticated request on the local set. Passwords use Argon2id (19 MiB, 2 iterations, parallelism 1), measured at about 13 ms per hash on an Apple M4 Pro.

`npm run build && npm run preview` uses development mode over loopback HTTP: the `session` cookie without `Secure`, and security headers without HSTS or `upgrade-insecure-requests`. That is why development, test, and preview modes accept only a loopback `APP_ORIGIN`. Stop `npm run dev` first: both use port 3000, and a busy port fails startup with the same generic line as any other startup problem.

**Production topology.** The API listens on `127.0.0.1` only, so production runs behind an HTTPS reverse proxy on the same host (or network namespace). The proxy terminates TLS for the public origin, redirects HTTP to HTTPS, and overwrites `X-Forwarded-For` with the client address. Production also needs an external replica set. Run `npm run build`, then `npm run start:prod` with `APP_ORIGIN` set to the public HTTPS origin, `MONGODB_URI` naming the replica set, and `TRUST_PROXY=127.0.0.1` (plus any upstream proxy addresses the local proxy forwards for). Startup refuses production without that trust: every client would share the proxy's address and therefore one rate-limit bucket. Startup failures print one generic line by design, so check these settings first. Hashed assets are revalidated (`max-age=0` with ETags) rather than cached long-term.

Integration tests cover production cookies and headers, and M4 drove production mode in Chromium through a local TLS-terminating proxy with a throwaway certificate (see Verification). That is not a deployed environment: no deployed HTTPS, failover, backup, or production security certification is claimed.

## Structure and next work

- `apps/web`: typed fetch client, stable session QueryClient, auth coordinator, route guards, shared accessible fields, signup/signin/welcome pages, CSS Modules, rendering error boundary, and focused state/race tests.
- `apps/api`: Nest modules for auth (controller, service, Argon2 hasher, session guard and cookie), users, and sessions; the HTTP pipeline (request IDs, mutation controls, security headers, rate limits, safe errors, logs); configuration and database startup; integration tests in `apps/api/test`.
- `packages/contracts`: browser/server-neutral strict Zod schemas for health, signup/signin/logout requests, public users, and error codes.
- `tests/e2e`: the real Chromium suite and its isolated-server fixture.
- `.github/workflows/ci.yml`: the GitHub Actions gate.
- `docs/plan`: owned contracts, milestone state, and acceptance evidence.
- `AI.md`: actual assistance and corrections.

The next milestone is **M6 — Submission**: making the repository public, confirming the submitted revision's CI run, and handing the link to the recruiter. M4 completed the accessibility review in Chromium (native 200% and 400% zoom, its built-in password manager, an automated WCAG scan) and the production-mode review. It also added CI and a security review whose findings are fixed. M5 followed this README from a clean clone and fixed what that walkthrough and a final independent review found. The repository is still private, and no deployed HTTPS environment or public submission is claimed. Testing covers Chromium only, rate-limit counters live in one process, and signup reveals whether an email is registered (a documented trade-off).

Frontend state follows Architecture A11: React Hook Form owns local fields; shared Zod resolvers normalize inputs; Query caches only the public user or null on a confirmed 401. Other session failures mean unavailable and hide protected content. Focus/reconnect/navigation checks preserve mounted public forms. Signup/signin are awaited coordinator actions, keeping passwords out of query/mutation caches; credential-free logout uses a mutation. Requests time out after 15 seconds and never automatically retry POSTs. An aborted request may still have completed on the server; use manual recovery. Session checks never modify cookies. A rendering failure offers Reload page. Read [AGENTS.md](AGENTS.md) before changing the baseline.
