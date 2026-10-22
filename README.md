# Easy Generator authentication task

A small full-stack authentication application. Visitors create an account, sign in, and reach a protected page that shows exactly `Welcome to the application.` It uses a React and TypeScript UI, a NestJS API, and MongoDB, with server-side sessions in an HttpOnly cookie.

## Quick start with Docker

You need only Docker with Compose v2: Docker Desktop, or Docker Engine with the Compose plugin. Node is not required. Verified with Docker 28.0 and Compose 2.33 to 2.38.

```sh
git clone https://github.com/HossamElAnsary/easygenerator-auth.git
cd easygenerator-auth
docker compose up --wait
```

The first run builds the images, which takes a few minutes; later runs start in seconds. Then open **http://localhost:8080**, create an account, and sign in.

| Task                          | Command                                                                     |
| ----------------------------- | --------------------------------------------------------------------------- |
| Stop, keeping accounts        | `docker compose down`                                                       |
| Rebuild after pulling changes | `docker compose up --build --wait`                                          |
| Use another port              | `APP_PORT=8090 docker compose up --wait`, then open `http://localhost:8090` |
| Follow the API's request log  | `docker compose logs -f app`                                                |
| Delete all accounts and data  | `docker compose down -v`                                                    |

This is a local preview over plain HTTP, not a production deployment. See [Production](docs/development.md#production).

## Features

- Signup with name, email, and password, checked by the same rules in the browser and on the server.
- Signin, the welcome page, session restore on refresh, and sign-out that revokes the session on the server.
- `GET /api/auth/me`, the protected endpoint, requires a valid, unexpired server-side session.
- Opaque 24-hour sessions in an HttpOnly cookie; MongoDB stores only a hash of each token. No JWT.
- Cross-site request protection, security headers, per-route rate limits, consistent error responses, and request logs without personal data.
- Schema, API integration, and real-browser tests, plus GitHub Actions CI.

## Develop with Node

You need Node **24.22.0** (pinned in `.nvmrc`), npm **12.2.0**, and Docker for MongoDB. Exact versions are enforced, and Node 24.22.0 bundles npm 11, so upgrade npm after selecting Node. With nvm:

```sh
nvm install
nvm use
npm install --global npm@12.2.0
npm ci
cp .env.example .env
docker compose up -d mongodb
npm run db:ready
npm run dev
```

Open **http://localhost:5173**. Use `localhost`, not the `127.0.0.1` address Vite prints: the API rejects form submissions from any origin other than `APP_ORIGIN`. Stop the server with Ctrl-C, and MongoDB with `docker compose stop`; its data is kept.

To run the compiled application instead, use `npm run build && npm run preview` and open http://localhost:3000.

## Tests and checks

Install the pinned Chromium once, then run the complete gate:

```sh
PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/ms-playwright" npx playwright install chromium
npm run check
```

| Command             | Runs                                                                 |
| ------------------- | -------------------------------------------------------------------- |
| `npm run lint`      | ESLint, the API and web boundary rules, and the Prettier check       |
| `npm run typecheck` | Strict TypeScript for every workspace                                |
| `npm test`          | Schema, API integration (against real MongoDB), and web tests        |
| `npm run test:e2e`  | A production build, then the Chromium journeys                       |
| `npm run check`     | All of the above                                                     |
| `npm run format`    | Formats the files the lint step checks (the only command that edits) |
| `npm run bench`     | The local load baseline, described in docs/development.md            |

Tests need the MongoDB replica set from the setup above, and each run uses its own generated databases. Stop `npm run dev` or `npm run preview` first, because the browser tests use port 3000. Single tests, test isolation, and CI are described in [docs/development.md](docs/development.md).

## Configuration

The Node workflow reads `.env`; copy it from `.env.example`. The Docker stack sets its own values in `compose.yaml` and needs no `.env`.

| Setting            | Purpose                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `NODE_ENV`         | `development`, `test`, or `production`                                                   |
| `PORT`             | API port, 3000 by default                                                                |
| `APP_ORIGIN`       | The exact browser origin; a loopback host outside production, HTTPS in production        |
| `SERVE_WEB`        | `false` with Vite; `true` when the API serves the compiled UI                            |
| `TRUST_PROXY`      | Off by default; production must include `127.0.0.1`, its same-host reverse proxy         |
| `MONGODB_URI`      | Replica-set URI without read, write, retry, or timeout options (those are fixed in code) |
| `MONGODB_TEST_URI` | Marker URI from which tests derive their own databases                                   |

## API

All routes are under `/api`. Every POST needs `Origin` equal to `APP_ORIGIN`, `X-CSRF-Protection: 1`, and `Content-Type: application/json`.

| Route                   | Body                              | Success                                 |
| ----------------------- | --------------------------------- | --------------------------------------- |
| `POST /api/auth/signup` | `{ "name", "email", "password" }` | `201 { "user" }`; no session is created |
| `POST /api/auth/signin` | `{ "email", "password" }`         | `200 { "user" }` and a session cookie   |
| `GET /api/auth/me`      | none; send the session cookie     | `200 { "user" }`                        |
| `POST /api/auth/logout` | `{}`                              | `204`, and the cookie expires           |
| `GET /api/health`       | none                              | `200 { "status": "ok" }`                |

[docs/api.md](docs/api.md) has the full contract (validation rules, cookies, error codes, rate limits) and a curl example.

## Project structure

```text
apps/web             React UI (Vite, React Router, React Hook Form, TanStack Query)
apps/api             NestJS API: modules/ (auth, users, sessions, health), http/, infrastructure/, config/
packages/contracts   Zod schemas and types shared by the UI and the API
tests/e2e            Playwright browser journeys
docker/              Dockerfiles for the mongodb, app, and proxy images
compose.yaml         The Docker stack; `docker compose up -d mongodb` starts only the database
docs/                API and development guides; docs/plan holds the specification
```

## Design notes

- **One origin.** The browser calls relative `/api` URLs with same-origin cookies, and CORS is off. In Docker and in production, the API also serves the compiled UI behind a reverse proxy.
- **Loopback API.** The API listens on `127.0.0.1` only; a proxy on the same host is the only way in. The Docker stack mirrors that layout.
- **Sessions, not tokens.** The cookie holds a random token. The server checks it, and its 24-hour expiry, against MongoDB on every authenticated request, so sign-out revokes it immediately.
- **Passwords** are hashed with Argon2id and never trimmed or logged.
- **MongoDB** runs as a single-node replica set, so the API can use majority writes and linearizable session reads. It is pinned to 7.0.45 because MongoDB 8.0 refuses to start on Linux kernels 6.19 through 7.0.13.

The decisions and their reasons are in [docs/plan/architecture.md](docs/plan/architecture.md).

## Limitations

- No deployed HTTPS environment exists. Production mode was exercised locally, including behind a TLS proxy.
- Browser tests cover Chromium only. The Docker stack is verified on macOS (arm64) locally and on Linux (amd64) in CI, not on Windows.
- Rate-limit counters live in memory in one process. Docker Desktop may count every local browser as one client.
- Signup reveals whether an email is already registered, a deliberate trade-off.
- The single-node database has no redundancy.

What would change if the project had to scale, and what would trigger each change, is in the [evolution register](docs/plan/evolution.md).

## More documentation

- [AI.md](AI.md): where AI assisted, what worked, and what was corrected.
- [PLAN.md](PLAN.md) and [docs/plan](docs/plan): requirements, architecture, delivery history, and verification evidence.
