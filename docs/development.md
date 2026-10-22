# Development guide

Setup is in the [README](../README.md). This guide covers the details behind it. The specification and its evidence live in [docs/plan](plan).

## Commands

| Command                        | Purpose                                                                    |
| ------------------------------ | -------------------------------------------------------------------------- |
| `npm ci`                       | Install exactly the lockfile                                               |
| `docker compose up -d mongodb` | Start only the database for the Node workflow                              |
| `npm run db:ready`             | Initialize the local replica set if needed and verify a writable primary   |
| `npm run dev`                  | Watch contracts, API, and web in dependency order                          |
| `npm run lint`                 | ESLint, the API and web boundary rules, and the Prettier check; no edits   |
| `npm run format`               | Format implementation and configuration files                              |
| `npm run typecheck`            | Strict checking of all workspaces and tests                                |
| `npm test`                     | Shared-schema, API integration, configuration, and web tests               |
| `npm run build`                | Build contracts, API, then web                                             |
| `npm run preview`              | Run the compiled stack on `http://localhost:3000` in development mode      |
| `npm run start:prod`           | Run the compiled stack with validated production configuration             |
| `npm run test:e2e`             | Build, then run the isolated Chromium suite                                |
| `npm run check`                | The complete local gate: lint, typecheck, tests, builds, and browser tests |
| `npm run check:foundation`     | The same without browsers                                                  |
| `npm run bench`                | Build, then run the local load baseline (see Performance baseline)         |
| `npm run docs:openapi`         | Build, then regenerate `docs/openapi.json` (see Calling the API)           |
| `docker compose up --wait`     | The whole application in containers at `http://localhost:8080` (see below) |

Exact package versions are pinned in the manifests and the single `package-lock.json`. npm 12 runs install scripts only for the versions allowed under `allowScripts` in `package.json` (Argon2 and SWC). `@scarf/scarf`, which `swagger-ui-dist` depends on, is listed as denied, so its install-analytics script never runs.

## Tests

Tests require the running replica set and `MONGODB_TEST_URI` from `.env.example`. Missing database prerequisites fail the suite instead of silently skipping integration checks. The marker database must be named `easy_generator_test` and differ from the application database. Each test application creates `easy_generator_test_<random UUID>` and can drop only that database. A forcibly killed run may leave its generated database behind; never delete application data broadly to clean up.

- **API integration tests** in `apps/api/test` drive the real Nest HTTP pipeline and MongoDB. Driver faults are injected only to test failure paths, using the driver's own error types.
- **API unit tests** sit beside the file they test as `<file>.test.ts` under `apps/api/src` and need no database. The boundary rules in `npm run lint` check them too: outside the persistence paths, a unit test that imports Mongoose or the MongoDB driver fails lint.
- **Web tests** use jsdom and mocked HTTP.
- **Browser tests** in `tests/e2e` run the compiled API and UI in Chromium (Playwright 1.64.1, kept in the ignored `.cache/ms-playwright`). Each case starts its own server on `http://localhost:3000` in test mode, with its own database and fresh production rate-limit counters. One worker runs the cases in order, without retries. Every case fails if the page reports a Content Security Policy violation. Screenshots and failure reports stay under the ignored `test-results/`.

The browser suite owns port 3000, so stop `npm run dev` and `npm run preview` first. The Docker stack can keep running: its API port is inside the containers. On Linux, install Playwright's system libraries with `npx playwright install --with-deps chromium`.

To run one file or a subset by name, pass Vitest arguments after `--`:

```sh
npm test -w @easy-generator/api -- test/signin.integration.test.ts -t 'fresh token'
npm test -w @easy-generator/web -- src/App.test.tsx
```

Workspace-level runs skip the contracts build, so run `npm run build -w @easy-generator/contracts` after changing `packages/contracts`.

## Continuous integration

`.github/workflows/ci.yml` runs on pushes to `main`, pull requests, manual runs, and weekly on `main` (Mondays 05:17 UTC), with read-only repository permissions, no secrets, and actions pinned to full commit SHAs. The weekly run catches a runner or registry change that breaks the pinned build without any push. Two jobs run in parallel:

- **check:** the pinned Node and npm, `docker compose up -d mongodb`, `npm ci`, `npm run db:ready`, lint, typecheck, workspace tests, Chromium with its system packages, and `npm run test:e2e`.
- **docker:** the README's Docker quick start on a clean runner, then a curl smoke test through the proxy: health, the UI and its CSP, and signup, signin, `me`, logout, and a rejected origin.

On failure, each job prints the containers' state and recent logs, because the tools themselves print one generic line.

`.github/dependabot.yml` opens a grouped pull request each month for new action releases and base-image updates: patch releases for `mongo` and nginx, and only a new digest of the same tag for `node`, whose version `.nvmrc` owns. Releases younger than seven days wait. Update npm packages by hand; a new version of `argon2` or `@swc/core` also needs its `allowScripts` entry in `package.json`.

## Docker stack

`docker compose up --wait` builds the images from the three Dockerfiles in `docker/` and waits until every service is healthy:

| Service        | Image                                    | Role                                                                                         |
| -------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| `mongodb`      | `mongo:7.0.45` plus the init scripts     | The single-node replica set on the volume `mongodb-data-7.0`; publishes ports 27018 and 8080 |
| `mongodb-init` | Built from the same Dockerfile, run once | Initializes or verifies the replica set, like `npm run db:ready`, then exits                 |
| `app`          | Node 24.22.0, compiled API and UI        | The API serving the compiled UI as `npm run preview` does; runs as the `node` user           |
| `proxy`        | Unprivileged nginx 1.30                  | Forwards everything to the API and overwrites `X-Forwarded-For`                              |

`app`, `proxy`, and `mongodb-init` share `mongodb`'s network namespace. That lets the API keep listening on `127.0.0.1` behind a same-host proxy, as in production, and lets the replica set advertise `localhost:27018` to the containers and to the host alike. Compose therefore declares every port on `mongodb`, and recreating `mongodb` recreates the others. Ports are bound to `127.0.0.1` only. The proxy streams request bodies, so the API's controls reject a request before reading it; a body over 1 MiB gets nginx's own HTML 413 instead of the API's JSON error.

The stack runs in development mode (a `session` cookie without `Secure`, no HSTS) on `http://localhost:8080`, or on `APP_PORT`. It uses the same database as `npm run dev`. Compose builds images that are missing and otherwise reuses them, so add `--build` after changing code. The project name is fixed, so every checkout and worktree shares the same containers, images, and volume.

## Local database

Compose pins MongoDB **7.0.45** by multi-platform digest. MongoDB 8.0 refuses to start on Linux kernels 6.19 through 7.0.13 ([SERVER-121912](https://jira.mongodb.org/browse/SERVER-121912)), which current CI runners and Linux distributions ship. Version 7.0 runs on them and is supported until August 2027.

The database is local, unauthenticated, and published on loopback port 27018 (not 27017, so it does not collide with another local MongoDB). It has one replica-set member and no redundancy; do not reuse its configuration for production. The initializer is restricted to this project's local and test setup and never reconfigures an existing set. Inspect data with `docker compose exec mongodb mongosh --port 27018`.

## Runtime behavior

Startup validates the configuration and the web assets, connects to a writable replica-set primary, then creates and verifies the unique `users.email`, unique `sessions.tokenHash`, and TTL `sessions.expiresAt` indexes before listening. Existing indexes are never dropped; a conflicting definition stops startup. Reads use the primary with majority read concern. Writes need majority and journal acknowledgment within 5 seconds. Server selection and reads have 5-second budgets, and sockets time out after 10 seconds. Session checks use a linearizable read, which costs about 0.1 s per authenticated request on the local set. Argon2id uses 19 MiB, 2 iterations, and parallelism 1, about 13 ms per hash on an Apple M4 Pro.

The API logs one JSON line per API request: request ID, method, route template, status, duration, and error code. It never logs bodies, email addresses, passwords, cookies, tokens, or connection strings. Startup failures print one generic line by design.

## Calling the API

The API contract is the OpenAPI 3.1 document: Swagger UI at `/api/docs` and the JSON at `/api/openapi.json`, both outside production only, plus the committed copy in `docs/openapi.json`. It is built in `packages/contracts/src/openapi.ts` from the same Zod schemas that validate requests, and the API passes in its real rate limits, session lifetime, and body limit. After changing a schema, a route, or one of those values, run `npm run docs:openapi`. A test fails while the committed file is stale, and another fails when a route the app serves is missing from the document.

Swagger UI's "Try it out" works because the page has the API's origin. Desktop tools such as Postman or Insomnia can import `/api/openapi.json`, but every POST must also set `Origin` to the app's address (for example `http://localhost:8080`), or the API answers `403 REQUEST_FORBIDDEN`. Browser-hosted tools on another origin cannot call the API: the Origin check rejects their POSTs, and CORS is disabled.

From the command line, this runs in bash or zsh against the Docker stack, with dummy credentials. For `npm run dev`, set `ORIGIN=http://localhost:5173` instead. Signup prints the new user, signin and `me` print the same user, logout prints `204`, and the last request prints a `401` error because the session was revoked. A repeated run gets `409 EMAIL_IN_USE` from signup and then continues.

```sh
ORIGIN=http://localhost:8080
JAR=$(mktemp)
JSON=(-H "Origin: $ORIGIN" -H 'X-CSRF-Protection: 1' -H 'Content-Type: application/json')
curl -s -w '\n' "${JSON[@]}" -d '{"name":"Ada Lovelace","email":"ada@example.com","password":"Analytical-1"}' "$ORIGIN/api/auth/signup"
curl -s -w '\n' -c "$JAR" "${JSON[@]}" -d '{"email":"ada@example.com","password":"Analytical-1"}' "$ORIGIN/api/auth/signin"
curl -s -w '\n' -b "$JAR" "$ORIGIN/api/auth/me"
curl -s -b "$JAR" -c "$JAR" -o /dev/null -w '%{http_code}\n' "${JSON[@]}" -d '{}' "$ORIGIN/api/auth/logout"
curl -s -w '\n' -b "$JAR" "$ORIGIN/api/auth/me"
```

## Production

The API listens on `127.0.0.1` only, so production runs behind an HTTPS reverse proxy on the same host or in the same network namespace. The proxy terminates TLS for the public origin, redirects HTTP to HTTPS, and overwrites `X-Forwarded-For` with the client address. Production also needs an external replica set. Run `npm run build`, then `npm run start:prod` with these settings:

- `APP_ORIGIN` set to the public HTTPS origin.
- `MONGODB_URI` naming the replica set.
- `TRUST_PROXY=127.0.0.1`, plus any upstream proxy addresses.

Startup refuses production without that proxy trust, because every client would otherwise share one rate-limit bucket. Production issues the `__Host-session` cookie with `Secure`, and adds HSTS. Hashed assets are revalidated (`max-age=0` with ETags) rather than cached long-term.

Integration tests cover production cookies and headers, and production mode was driven in Chromium through a local TLS-terminating proxy. No deployed HTTPS environment, failover, backup, or security certification is claimed.

## Performance baseline

`npm run bench` builds, then starts the compiled API in production mode as its own process against a throwaway `easy_generator_bench_<random>` database beside the test database, and drops only that database afterwards. It needs the replica set and `MONGODB_TEST_URI`, and takes about three minutes. An interrupted run (Ctrl+C) leaves its `easy_generator_bench_*` database behind; drop only that database. It measures signup, signin, `/api/auth/me`, and logout at 1, 4, 16, and 64 connections, with rate limits enabled: each request presents its own client address through the loopback proxy trust, as the tests do. It also times `/api/health` while signin is under load, and the session lookup under each read concern. Options: `--duration <seconds>`, `--levels 1,4,16,64`, and `--threadpool <n>` (sets `UV_THREADPOOL_SIZE` for the API).

Results depend on the machine, so compare only runs from the same machine and command. The recorded baseline (Verification T19) found two things worth knowing before a deployment:

- **Password hashing is limited by libuv's thread pool.** Argon2 runs there, 4 threads by default, so signup and signin throughput stops growing once concurrent hashing requests exceed the pool size, and further requests queue. `/api/health`, timed alongside, was not slowed. On a 14-CPU machine, 8 threads nearly doubled hashing throughput with no visible cost to health checks, while 16 threads raised their tail latency. Only `/api/health` was timed alongside, and nothing between 8 and 16 threads was measured, so there is no general rule: choose `UV_THREADPOOL_SIZE` per deployment and confirm it with `npm run bench -- --threadpool <n>` on that machine.
- **An authenticated request costs about one MongoDB journal commit interval** on the single-node replica set (about 105 ms at the default 100 ms), because the session check is a linearizable read (Architecture A10). A multi-node production replica set behaves differently and needs its own measurement.

## Troubleshooting

- **Forms fail with `This request is not allowed.`** The page is open on another origin, such as `http://127.0.0.1:5173`. Use `http://localhost:5173` in development and `http://localhost:8080` with Docker.
- **The API exits with one generic startup line.** Check the configuration, `npm run db:ready`, built assets when `SERVE_WEB=true`, and that `PORT` is free. A dev, preview, or browser-test server may already hold port 3000.
- **`npm ci` stops with `EBADENGINE`.** Select Node 24.22.0 and upgrade npm to 12.2.0; the versions are enforced exactly.
- **An old MongoDB 8.0 volume.** A checkout that ran a revision before 7.0.45 keeps the unused volume `easy-generator_mongodb-data`, which 7.0 cannot open. Remove it with `docker volume rm easy-generator_mongodb-data` once you no longer need its data.
- **A 502 right after `npm run dev` starts.** The watchers' first compiles restart the API once or twice in its first seconds; retry the request.
- **Port 8080 is busy.** Start the Docker stack with `APP_PORT=8090` (or another free port).
