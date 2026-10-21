# Development guide

Setup is in the [README](../README.md). This guide covers the details behind it. The specification and its evidence live in [docs/plan](plan).

## Commands

| Command                        | Purpose                                                                    |
| ------------------------------ | -------------------------------------------------------------------------- |
| `npm ci`                       | Install exactly the lockfile                                               |
| `docker compose up -d mongodb` | Start only the database for the Node workflow                              |
| `npm run db:ready`             | Initialize the local replica set if needed and verify a writable primary   |
| `npm run dev`                  | Watch contracts, API, and web in dependency order                          |
| `npm run lint`                 | ESLint (including React Hooks rules) and the Prettier check; no edits      |
| `npm run format`               | Format implementation and configuration files                              |
| `npm run typecheck`            | Strict checking of all workspaces and tests                                |
| `npm test`                     | Shared-schema, API integration, configuration, and web tests               |
| `npm run build`                | Build contracts, API, then web                                             |
| `npm run preview`              | Run the compiled stack on `http://localhost:3000` in development mode      |
| `npm run start:prod`           | Run the compiled stack with validated production configuration             |
| `npm run test:e2e`             | Build, then run the isolated Chromium suite                                |
| `npm run check`                | The complete local gate: lint, typecheck, tests, builds, and browser tests |
| `npm run check:foundation`     | The same without browsers                                                  |
| `docker compose up --wait`     | The whole application in containers at `http://localhost:8080` (see below) |

Exact package versions are pinned in the manifests and the single `package-lock.json`. npm 12 runs install scripts only for the versions allowed under `allowScripts` in `package.json` (Argon2 and SWC).

## Tests

Tests require the running replica set and `MONGODB_TEST_URI` from `.env.example`. Missing database prerequisites fail the suite instead of silently skipping integration checks. The marker database must be named `easy_generator_test` and differ from the application database. Each test application creates `easy_generator_test_<random UUID>` and can drop only that database. A forcibly killed run may leave its generated database behind; never delete application data broadly to clean up.

- **API tests** drive the real Nest HTTP pipeline and MongoDB. Driver faults are injected only to test failure paths, using the driver's own error types.
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

`.github/workflows/ci.yml` runs on pushes to `main`, pull requests, and manual runs, with read-only repository permissions, no secrets, and actions pinned to full commit SHAs. Two jobs run in parallel:

- **check:** the pinned Node and npm, `docker compose up -d mongodb`, `npm ci`, `npm run db:ready`, lint, typecheck, workspace tests, Chromium with its system packages, and `npm run test:e2e`.
- **docker:** the README's Docker quick start on a clean runner, then a curl smoke test through the proxy: health, the UI and its CSP, and signup, signin, `me`, logout, and a rejected origin.

On failure, each job prints the containers' state and recent logs, because the tools themselves print one generic line.

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

## Production

The API listens on `127.0.0.1` only, so production runs behind an HTTPS reverse proxy on the same host or in the same network namespace. The proxy terminates TLS for the public origin, redirects HTTP to HTTPS, and overwrites `X-Forwarded-For` with the client address. Production also needs an external replica set. Run `npm run build`, then `npm run start:prod` with these settings:

- `APP_ORIGIN` set to the public HTTPS origin.
- `MONGODB_URI` naming the replica set.
- `TRUST_PROXY=127.0.0.1`, plus any upstream proxy addresses.

Startup refuses production without that proxy trust, because every client would otherwise share one rate-limit bucket. Production issues the `__Host-session` cookie with `Secure`, and adds HSTS. Hashed assets are revalidated (`max-age=0` with ETags) rather than cached long-term.

Integration tests cover production cookies and headers, and production mode was driven in Chromium through a local TLS-terminating proxy. No deployed HTTPS environment, failover, backup, or security certification is claimed.

## Troubleshooting

- **Forms fail with `This request is not allowed.`** The page is open on another origin, such as `http://127.0.0.1:5173`. Use `http://localhost:5173` in development and `http://localhost:8080` with Docker.
- **The API exits with one generic startup line.** Check the configuration, `npm run db:ready`, built assets when `SERVE_WEB=true`, and that `PORT` is free. A dev, preview, or browser-test server may already hold port 3000.
- **`npm ci` stops with `EBADENGINE`.** Select Node 24.22.0 and upgrade npm to 12.2.0; the versions are enforced exactly.
- **An old MongoDB 8.0 volume.** A checkout that ran a revision before 7.0.45 keeps the unused volume `easy-generator_mongodb-data`, which 7.0 cannot open. Remove it with `docker volume rm easy-generator_mongodb-data` once you no longer need its data.
- **A 502 right after `npm run dev` starts.** The watchers' first compiles restart the API once or twice in its first seconds; retry the request.
- **Port 8080 is busy.** Start the Docker stack with `APP_PORT=8090` (or another free port).
