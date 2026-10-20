# Easy Generator authentication task

Implementation currently covers **M1 — Foundation** and **M2 — Authentication API** of [baseline v1.2](PLAN.md): a React/TypeScript workspace; a NestJS API with signup, signin, a protected session check, and logout; shared Zod contracts; and MongoDB persistence for users and sessions. The browser screens and the required welcome page are scheduled for M3 and are not implemented yet, so the API is exercised directly for now (see [Authentication API](#authentication-api)). See [Delivery](docs/plan/delivery.md) and [Verification](docs/plan/verification.md) for actual progress and evidence.

## Prerequisites and versions

- Node **24.22.0**, pinned in `.nvmrc` and `.node-version`; npm **12.2.0**, pinned in `package.json`.
- Docker with Compose v2 for the local single-node MongoDB replica set. No globally installed Nest CLI or MongoDB is required.
- Free loopback ports 3000 (API), 5173 (Vite), and 27018 (MongoDB).

Compose pins MongoDB **8.0.32** and its multi-platform image digest. Port 27018 avoids the existing MongoDB service on this workstation; the container also advertises `localhost:27018` so host-side replica-set discovery works. npm 12 install-script permissions are version-scoped for SWC and Argon2; the optional fsevents install script remains disabled. The lockfile install and native-addon smoke were verified on macOS arm64.

Use your Node version manager to install/select the pinned version (`nvm install && nvm use` for nvm), then `npm install --global npm@12.2.0` if needed. Check `node --version` and `npm --version` before installing. Strict engine checks intentionally reject another runtime.

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

Open `http://localhost:5173`. The minimal foundation page calls `/api/health` through Vite's proxy and shows readiness only; the authentication screens arrive in M3. The API listens on loopback port 3000, behind the same proxy, and logs one JSON line per API request (request ID, method, route template, status, duration, error code). The development command builds shared contracts and the API first, then watches contracts/API/web. Stop it with Ctrl-C. `docker compose stop` stops MongoDB while retaining the project volume.

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
| `npm run check:foundation` | Run every check available today: lint, typecheck, tests, build                                         |

The full `check` command and `test:e2e` are deferred until the real browser journeys exist (M3/M4). CI is M4. Passing these checks is not a browser-journey or release pass.

Tests require the running replica set and `MONGODB_TEST_URI` from `.env.example`; missing database prerequisites fail the suite instead of silently skipping integration checks. The marker database must be named `easy_generator_test` and differ from the application database. Each test application creates `easy_generator_test_<random UUID>` and can drop only that exact owned database. API tests drive the real Nest HTTP pipeline and MongoDB; driver faults are injected only to test failure paths, using the driver's own error types. Web tests use jsdom and mocked HTTP. No real-browser journey exists before M3.

To run one test file or a subset by name, pass Vitest arguments after `--`, for example `npm test -w @easy-generator/api -- test/signin.integration.test.ts -t 'fresh token'`. Workspace-level runs skip the contracts build, so run `npm run build -w @easy-generator/contracts` first after changing `packages/contracts`.

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

Example against `npm run dev` with dummy credentials. A repeated run gets `409` from signup and then continues.

```sh
ORIGIN=http://localhost:5173
JAR=$(mktemp)
JSON=(-H "Origin: $ORIGIN" -H 'X-CSRF-Protection: 1' -H 'Content-Type: application/json')
curl -s "${JSON[@]}" -d '{"name":"Ada Lovelace","email":"ada@example.com","password":"Analytical-1"}' "$ORIGIN/api/auth/signup"
curl -s -c "$JAR" "${JSON[@]}" -d '{"email":"ada@example.com","password":"Analytical-1"}' "$ORIGIN/api/auth/signin"
curl -s -b "$JAR" "$ORIGIN/api/auth/me"
curl -s -b "$JAR" -c "$JAR" -o /dev/null -w '%{http_code}\n' "${JSON[@]}" -d '{}' "$ORIGIN/api/auth/logout"
curl -s -b "$JAR" "$ORIGIN/api/auth/me" # 401: the session was revoked
```

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

Startup validates configuration and required assets, connects to a writable replica-set primary, then creates and verifies the unique `users.email`, unique `sessions.tokenHash`, and TTL `sessions.expiresAt` indexes before listening. Existing indexes are never dropped; a conflicting definition stops startup. Database policy uses primary/majority reads, majority and journal-acknowledged writes (5-second write concern budget), 5-second server selection/read budgets, and a 10-second socket timeout. Session checks use a primary linearizable read bounded to 5 seconds, which costs about 0.1 s per authenticated request on the local set. Passwords use Argon2id (19 MiB, 2 iterations, parallelism 1), measured at about 13 ms per hash on an Apple M4 Pro.

`npm run build && npm run preview` uses development mode over loopback HTTP: the `session` cookie without `Secure`, and security headers without HSTS or `upgrade-insecure-requests`. Production requires an external replica set and an HTTPS reverse proxy for the configured origin; explicit trusted ingress configuration and preventing direct public API access remain deployment responsibilities. Production cookie and header behavior is covered by integration tests in production mode, but no deployed HTTPS environment, failover, backup, or production security certification is claimed.

## Structure and next work

- `apps/web`: minimal React readiness screen and library integration smoke tests.
- `apps/api`: Nest modules for auth (controller, service, Argon2 hasher, session guard and cookie), users, and sessions; the HTTP pipeline (request IDs, mutation controls, security headers, rate limits, safe errors, logs); configuration and database startup; integration tests in `apps/api/test`.
- `packages/contracts`: browser/server-neutral strict Zod schemas for health, signup/signin/logout requests, public users, and error codes.
- `docs/plan`: owned contracts, milestone state, and acceptance evidence.
- `AI.md`: actual assistance and corrections.

M3 adds the browser authentication journey on top of this API: the typed client, session query and coordinator, signup/signin/welcome screens, and real-browser tests. Read [AGENTS.md](AGENTS.md) before changing the baseline.
