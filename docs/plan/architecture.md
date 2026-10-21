# Architecture and Contracts

Return to [PLAN.md](../../PLAN.md). This document owns implementation choices and contract details. [Engineering standards](engineering.md) defines OOP/SOLID responsibilities and code review criteria. This is the baseline contract; [Verification](verification.md) distinguishes implemented M1 foundation behavior from later Pending work.

## A01 — Stack and boundaries

| Layer | Choice | Reason |
| --- | --- | --- |
| Runtime | Patched Node.js 24 LTS; exact patch recorded at M1 | Supported runtime shared by local development and CI |
| Package management | npm workspaces and one committed lockfile | Reproducible installation without an additional build orchestrator |
| Web | React, TypeScript strict mode, Vite, React Router | User-selected framework; small client-rendered application |
| UI | CSS Modules and accessible native form controls | Small shared layout/field components; no UI framework required |
| Forms | `react-hook-form`, `@hookform/resolvers`, shared Zod schemas | Local form lifecycle and typed validation without duplicated rules |
| Server state/transport | `@tanstack/react-query`, small auth coordinator, native fetch wrapper | Query cache owns server data; coordinator derives auth state and sequences actions; fetch sends HTTP requests; see A11 |
| API | NestJS with Express adapter; target compatible stable Nest 12 packages | Required backend framework with ordinary modules, services, guards, and exception handling |
| Persistence | MongoDB through Mongoose and `@nestjs/mongoose` | Required database with established Nest integration |
| Contracts | Shared Zod schemas, inferred TypeScript request/response types, and policy constants | One validation policy used by browser and server |
| Security libraries | Maintained Argon2 package, cookie parser, Helmet, Nest throttler | Standard implementations for hashing, cookies, headers, and throttling |
| Verification | Vitest-compatible Nest test setup, Supertest, React Testing Library where useful, Playwright | Contract/integration checks plus a small browser suite |

M1 pins compatible stable versions, the MongoDB image, and the Node/npm versions. Commit the lockfile; use `npm ci` thereafter. Do not use unpinned `latest` images or silently mix Nest package majors. The foundation gate must prove backend dependency injection, validation, shared-package imports, tests, and builds before feature work proceeds.

M1 resolved Node 24.22.0/npm 12.2.0, Nest core/common/platform/testing 12.2.0, `@nestjs/mongoose` 12.0.0 with Mongoose 9.11.2, React 19.3.1, Vite 8.3.4, TypeScript 6.0.3, Zod 4.6.7, RHF 7.90.0/resolvers 6.0.0, Query 5.104.5, and Vitest 5.0.5. TypeScript 7 was excluded because the pinned TypeScript ESLint peer range is `<6.1`. Manifests and lockfile own all exact patches; README records prerequisites. The generated Nest ESM configuration was inspected and adapted to the workspace; SWC explicitly emits legacy decorator metadata for tests. The native Argon2 0.45.1 smoke validates installation only, not M2 password behavior. M2 added Helmet 8.3.0, cookie-parser 1.4.7, and `@nestjs/throttler` 6.7.1, whose peer range includes Nest 12, plus `@types/cookie-parser` 1.4.10; no fallback throttler was needed.

Node 24 is an LTS line. Current Vite and Nest have runtime/tooling version floors, and Nest 12 changes module and test defaults; use a compatible generated ESM setup and verify it rather than assuming an older scaffold works. [Node releases](https://nodejs.org/en/about/previous-releases), [Vite setup](https://vite.dev/guide/), [Nest migration and tooling notes](https://docs.nestjs.com/migration-guide).

Use Nest's schema validation support to apply strict shared schemas and map failures into the error contract below. Do not maintain a second, independently edited set of validation rules. [Nest validation](https://docs.nestjs.com/techniques/validation).

Planned layout:

```text
apps/
  web/src/              # routes, auth context, forms, API client, styles
  api/src/              # auth, users, sessions, config, common HTTP handling
packages/
  contracts/src/        # schemas, public types, validation constants
tests/
  e2e/                  # browser journeys and fixtures
docs/plan/              # this baseline and acceptance evidence
.github/workflows/      # selected CI checks
PLAN.md
README.md
AI.md
.env.example
compose.yaml            # local MongoDB only
package.json
package-lock.json
```

Keep controllers thin, business logic in services, and Mongo schemas near their owning module. A session guard resolves a public user for protected requests. Avoid generic repository frameworks, CQRS, event buses, or dependencies from contracts into either application. Shared contracts build before consumers; the development command must perform an initial build and watch subsequent contract changes.

## A02 — One origin and runtime topology

- Development: browser uses `http://localhost:5173`; Vite proxies `/api` to the API on loopback port 3000. The browser never needs a separate API origin. Preserve the browser's Origin header through the proxy.
- Production build: Nest serves the compiled web assets and the API. An HTTPS reverse proxy exposes one public origin. API routes and unknown `/api/*` paths must never fall through to the SPA HTML response.
- Direct requests to `/signin`, `/signup`, and `/app` serve the SPA. Missing assets remain 404 responses; a failed request for an existing asset keeps its own status (for example 416 or 412). Browser routes render their own not-found state.
- Deployment scope is one API process plus MongoDB. TLS termination and cloud provisioning are outside this assignment; the README must state the HTTPS and trusted-proxy requirements.
- The API listens on `127.0.0.1` only, so the HTTPS reverse proxy runs on the same host or network namespace, redirects HTTP to HTTPS, and overwrites `X-Forwarded-For` (A07). Direct public access to the API port is not possible by construction.
- A local built-artifact preview uses loopback HTTP and development cookie settings, and is explicitly labeled a preview. It must not claim to validate a deployed HTTPS environment. Development, test, and preview modes serve only a loopback origin, because they issue cookies without `Secure` and omit HSTS.
- CORS remains disabled. The fetch client uses relative `/api` URLs and same-origin credentials. No session secret is stored in localStorage, sessionStorage, query parameters, or application JSON.

## A03 — Data model and indexes

| Collection | Fields | Required indexes |
| --- | --- | --- |
| `users` | `_id`, `email`, `name`, `passwordHash`, `createdAt`, `updatedAt` | Unique index on normalized `email` |
| `sessions` | `_id`, `tokenHash`, `userId`, `createdAt`, `expiresAt` | Unique `tokenHash`; TTL on `expiresAt` with `expireAfterSeconds: 0` |

`email` stores the normalized identity value, `name` the trimmed display value, and `passwordHash` an encoded Argon2id hash. Public users contain only `id`, `email`, and `name`. Session records and credential fields never enter public serialization.

Create and verify the required indexes before accepting application traffic. Production startup uses explicit, non-destructive index creation/verification; do not use an automatic operation that drops unrelated indexes. Missing indexes or an unavailable database prevent readiness. Signup catches the database duplicate-key result and maps it to the documented conflict response; a precheck alone is insufficient under concurrency. [MongoDB unique indexes](https://www.mongodb.com/docs/manual/core/index-unique/).

Read the session by its immutable, unique `tokenHash` using the consistency policy in A10, then require `expiresAt > now` and an existing user. Recheck expiry against server time after the read completes. MongoDB TTL deletion is asynchronous, so an expired document may remain stored and must still be rejected immediately. [MongoDB TTL indexes](https://www.mongodb.com/docs/manual/core/index-ttl/).

## A04 — Input policy

These interpretations and upper bounds are chosen safeguards, not extra rules quoted from the brief. Apply them identically through shared schemas; count string length by Unicode code points.

| Input | Contract |
| --- | --- |
| Signup email | String; trim outer whitespace; lowercase consistently; validate conventional email format with the shared schema; maximum 254 characters |
| Signup name | String; trim outer whitespace; 3–100 characters; permit international letters and internal spaces |
| Signup password | String; 8–128 characters; at least one Unicode letter (`\p{L}`), decimal digit (`\p{Nd}`), and punctuation or symbol (`[\p{P}\p{S}]`) |
| Signin email | Same email normalization, format, and maximum length |
| Signin password | Nonempty string, maximum 128 characters; verify against stored hash; do not reapply signup composition rules |
| Logout body | Empty JSON object `{}` |
| All bodies | Strict object schemas; reject missing required fields, wrong types, arrays, null bodies, and unexpected properties; no implicit coercion |

Never trim, normalize, lowercase, or truncate passwords. Whitespace is permitted but does not satisfy the special-character requirement. Do not add uppercase/lowercase requirements. Email lowercasing is the selected account-identity policy; do not remove dots or rewrite provider-specific aliases. Apply a 16 KiB JSON body limit before expensive work, and construct database queries from parsed scalar values only.

Reject strings that contain unpaired UTF-16 surrogates (`Enter a valid …` field errors). JSON can carry them, but they cannot be encoded to UTF-8 for hashing or BSON storage without silent replacement, which would break exact preservation. Required-field, emptiness, and maximum-length checks run before format/composition checks and stop further checks for that field, so the email pattern never runs on an over-length value.

## A05 — HTTP contract

All paths are prefixed with `/api`. All auth responses, including failures, send `Cache-Control: no-store`. Mutation requests require the origin/header/content-type rules in A07.

| Method and path | Request | Success | Expected route-specific failures |
| --- | --- | --- | --- |
| `POST /auth/signup` | `{ name, email, password }` | `201 { user }`; creates account only; no session cookie | `400 VALIDATION_ERROR`; `409 EMAIL_IN_USE` |
| `POST /auth/signin` | `{ email, password }` | `200 { user }`; persists a fresh session and sets cookie | `400 VALIDATION_ERROR`; `401 INVALID_CREDENTIALS` |
| `GET /auth/me` | Session cookie | `200 { user }` | `401 UNAUTHENTICATED` |
| `POST /auth/logout` | `{}` and optional session cookie | `204`; no body; deletes presented session and expires cookie | `503 SERVICE_UNAVAILABLE` if required session deletion fails |
| `GET /health` | None | `200 { status: "ok" }` when API/database ready | `503 { status: "unavailable" }`; no infrastructure details |

`user` is `{ id: string, email: string, name: string }`. The health route is a selected operational helper, not the protected endpoint. `/auth/me` is the protected endpoint required by R07.

Auth error shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check the highlighted fields.",
    "fields": { "email": ["Enter a valid email address."] },
    "requestId": "server-generated-id"
  }
}
```

`fields` is present only for field validation errors. Failures with no field-specific issue (malformed JSON, a non-object body, or an unexpected property) use the generic message `The request body is invalid.` and omit `fields`; schema issues about unexpected keys are never echoed. The same server-generated request ID is sent in `X-Request-Id` and used in safe logs. Error responses do not echo input values, SQL/Mongo errors, stack traces, hashes, or tokens.

| Condition | Status and code | Behavior |
| --- | --- | --- |
| Malformed JSON or invalid body | `400 VALIDATION_ERROR` | Safe generic message or field errors |
| Unknown email / incorrect password | `401 INVALID_CREDENTIALS` | Identical message: `Email or password is incorrect.` |
| Missing, invalid, expired, revoked session or missing user | `401 UNAUTHENTICATED` | No user data; do not modify cookies on the session-check response |
| Origin/custom-header rejection | `403 REQUEST_FORBIDDEN` | No state change |
| Unknown API route or method | `404 NOT_FOUND` | Safe generic message; never SPA HTML or an echoed path |
| Duplicate normalized email | `409 EMAIL_IN_USE` | `An account with this email already exists.` |
| Oversized body | `413 PAYLOAD_TOO_LARGE` | Rejected before hashing |
| Unsupported content type | `415 UNSUPPORTED_MEDIA_TYPE` | No form-encoded mutation support |
| Throttled request | `429 RATE_LIMITED` | Include `Retry-After` in seconds |
| Database/dependency unavailable | `503 SERVICE_UNAVAILABLE` | No false authentication success or false successful logout |
| Unexpected failure | `500 INTERNAL_ERROR` | Safe generic message; internal correlation ID |

The duplicate-email response intentionally reveals registration status for usable assignment feedback. This tradeoff is documented; generic signin errors do not remove this signup disclosure. API mutations are not automatically retried by the client. A lost response can leave an account/session created; the user can explicitly signin or retry as appropriate. Do not claim exactly-once delivery.

`GET /auth/me` never sends `Set-Cookie`, including on 401. Otherwise a delayed response for an old session could erase the cookie issued by a newer signin. Signin sets/replaces the cookie and explicit logout expires it; a retained invalid cookie remains harmless because the server rejects it.

## A06 — Password and session lifecycle

Use Argon2id with at least `memoryCost=19456 KiB`, `timeCost=2`, and `parallelism=1`. Verify hashes through the library and retain its encoded parameters/salt. Benchmark before increasing cost. M2 measured these values at a median of 13.1 ms per hash and per verification on an Apple M4 Pro (Node 24.22.0, 20 runs each) and keeps them as the selected cost. For unknown-email signin, verify against a precomputed dummy hash with matching parameters before returning the same credential error. This reduces an obvious timing distinction without claiming perfect timing indistinguishability. [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

After successful signin, generate 32 cryptographically random bytes, encode as base64url, store only the SHA-256 token hash with `userId` and timestamps, and set the raw token only in the cookie. Validate the canonical 43-character base64url token shape before database lookup. Never adopt a token provided by the client. Session creation must persist before success is returned.

Each signin creates an independent session; replacing a browser cookie does not renew or change an older record. An older unpresented token expires on its own. Logout revokes only the presented session, not other devices. This avoids a session-management feature set while making the behavior explicit.

Expiry is fixed at **24 hours from issuance**, with no sliding renewal. Match the cookie's lifetime to that timestamp. This duration is a choice for this small application, not a universal security recommendation.

| Environment | Cookie |
| --- | --- |
| Local HTTP development/preview | `session`; HttpOnly; SameSite=Lax; Path=/; no Domain; Secure=false |
| HTTPS production | `__Host-session`; HttpOnly; Secure; SameSite=Lax; Path=/; no Domain |

Derive production cookie settings from validated runtime configuration; do not allow a production insecure-cookie override. Cookie deletion must match the issuance name/path/domain and use an expired lifetime. Session tokens have high random entropy, so a fast one-way hash is appropriate for their database verifier; passwords use the dedicated password hash above. [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

Logout is idempotent when the cookie is missing, malformed, expired, or already revoked. For a well-formed presented token, attempt deletion; return 204 only after the operation succeeds or authoritative absence is confirmed under A10. On database/acknowledgment failure return 503, do not clear the cookie or claim successful logout, and let the user retry. A session check begun after confirmed revocation must reject that token; a request already authorized before revocation may finish. Logout does not cancel in-flight work.

## A07 — Request security and operations

Every POST requires **all three**: exact `Origin === APP_ORIGIN`, `X-CSRF-Protection: 1`, and JSON `Content-Type`. Reject absent, null, malformed, and mismatched origins; compare to configured public origin rather than incoming Host headers. Logout sends `{}`. CORS is disabled and GET never mutates state. The custom header is not a secret; it relies on browser cross-origin restrictions. SameSite is additional protection, not the only defense. Document required headers in curl/API examples. [OWASP CSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

The controls cover every `/api` request whose method is not GET, HEAD, or OPTIONS; all Nest handlers live under `/api`. They run before body parsing, so rejected requests are not read. JSON bodies are parsed without decompression; a compressed request body receives `415`.

Use Helmet and verify the production CSP permits the built application without enabling unsafe inline scripts. Production uses Helmet's defaults, including HSTS and `upgrade-insecure-requests`. Local HTTP modes (development, test, and the loopback preview) disable only those two, because browsers ignore HSTS over HTTP and may upgrade loopback subresource requests to HTTPS, breaking the documented preview. Render user text through ordinary React escaping; do not insert user HTML. The CSP has no `'unsafe-eval'`: the browser bundle runs Zod jitless, because Zod's `new Function` capability probe is reported as a violation even when it is caught, and every browser test fails on a reported violation.

Rate limits are **per route and IP per 60-second window**: default 120; signup override 5; signin override 10; logout override 30. Use the maintained throttler with expiring in-memory counters. These initial limits are chosen values, not validated capacity guarantees. They reset on restart and are not shared across replicas; distributed/account-level defenses are out of scope. [Nest rate limiting](https://docs.nestjs.com/security/rate-limiting).

Default proxy trust is off. If behind a reverse proxy, configure only its known address/subnet and ensure public traffic cannot bypass it. The proxy must overwrite client forwarding headers; use trusted `req.ip`, never raw `X-Forwarded-For`, for limiting. Avoid unconditional proxy trust. Production is always behind the same-host proxy (A02), so production startup requires `TRUST_PROXY` to include `127.0.0.1`; without it every client shares the proxy's address and each per-IP limit becomes one global bucket. Upstream proxy addresses that the local proxy forwards for may be added. [Express proxy guidance](https://expressjs.com/en/guide/behind-proxies/).

Log request ID, method, route, status, elapsed time, and safe error/event codes. Do not log request bodies, email addresses, passwords/hashes, session tokens, Cookie/Set-Cookie, Authorization, or database credentials. Sanitize unexpected exceptions before logging; raw driver errors can contain submitted data. Bound request duration and use graceful shutdown; do not return internal dependency details through health or errors.

## A08 — Configuration and reproducibility

| Setting | Planned contract |
| --- | --- |
| `NODE_ENV` | Validated development/test/production mode |
| `PORT` | API port; local default 3000 |
| `MONGODB_URI` | Required runtime connection URI; never exposed to the client. Must name a replica set and database and carry no read-preference, read/write-concern, retry, or timeout options (including the deprecated `wtimeout` alias), because A10's policy is fixed in code |
| `APP_ORIGIN` | One exact scheme/host/port origin, no path; a loopback host (`localhost`, `127.0.0.1`, `[::1]`) outside production, HTTPS required in production |
| `SERVE_WEB` | False during Vite development; true for built preview/production; require assets when true |
| `TRUST_PROXY` | Off by default outside production; production must include `127.0.0.1`, the same-host proxy (A07), and may add upstream proxy addresses/subnets |
| `MONGODB_TEST_URI` | Dedicated local/CI test database connection, separate from application data |

Keep fixed policy constants in the contracts/config modules rather than adding environment knobs for every decision. Fail startup for missing or unsafe configuration; never silently fall back to an in-memory database. No JWT signing secret is needed for this opaque-session design.

Provide `.env.example` with placeholders and safe localhost defaults; ignore real environment files, database data, dependencies, build outputs, and test artifacts. Local Compose runs one MongoDB server as a single-node replica set with a pinned image, idempotent initialization, primary-readiness check, and loopback-bound port, following A10. Document that this local setup is not a redundant/public database deployment. Tests use isolated generated database names and refuse destructive cleanup of ordinary application databases.

M1 local setup pins `mongo:8.0.32` by multi-platform digest in `compose.yaml`, using `easy-generator-rs` and `localhost:27018` both inside the container and from the host. The existing host service on 27017 is left untouched. `db:ready` accepts only the documented local development/test URIs, runs initialization inside this project's Compose container, checks existing configuration without reconfiguration, then verifies host-side discovery. Runtime startup never initializes a database. M2 implements the awaited index hook: it creates the A03 indexes (`users.email_1` unique, `sessions.tokenHash_1` unique, `sessions.expiresAt_1` TTL 0) without dropping or modifying anything, then verifies each exact definition. A conflicting existing definition fails startup and is left in place.

Startup connects to MongoDB, ensures indexes, validates configuration/assets, then becomes ready. If the database later becomes unavailable, health returns 503 and dependent auth operations fail safely. Exact package patches, image tag/digest, commands, and measured hashing cost are recorded during M1/M2; these are verification tasks, not permission to change the contracts silently.

## A09 — Authentication and authorization decisions

These are explicit engineering selections for this assignment. The brief requires signup, signin, and a protected endpoint; it does not require JWT, an access/refresh pair, or business roles.

| Question | Selected decision | Reason / cost |
| --- | --- | --- |
| How is identity established? | Email/password verification using Argon2id | Matches the required signin form; hashing details remain in A06 |
| Will we use JWT? | No; generate an opaque random session credential | One browser app and one API can use MongoDB as the authoritative session store |
| Access and refresh tokens? | No pair and no refresh endpoint; one fixed-expiry session | No requirement for renewal; the user signs in again after expiry |
| Where is the credential stored in the browser? | The HttpOnly cookie defined in A06 | JavaScript does not need the token; HTTPS/Secure and request controls protect its transport/use |
| What is stored on the server? | Token hash, user ID, and session timestamps in MongoDB | Allows server-enforced expiry and current-session revocation; adds a database lookup |
| Where are identity claims trusted? | The server resolves them from the validated session and stored user | Never trust a browser-supplied user ID, email, or role as authorization evidence |
| Will we implement RBAC? | No role field, admin role, role guard, or permission-management feature | The business scope has one authenticated user category and no privileged operation |
| Will authorization still exist? | Yes: authenticated callers can access their own profile through `/auth/me` | Identity comes from the session; anonymous requests cannot access the resource |

Token format, lifecycle, and transport are separate choices. JWT defines a claims format; cookies can carry either an opaque credential or a JWT. A signed JWT does not inherently hide its payload. A refresh token also need not be a JWT. [JWT specification](https://www.rfc-editor.org/info/rfc7519/).

A JWT access/refresh design could be valid, but would require decisions about signing keys, allowed algorithms, issuer/audience, token lifetime, refresh storage/rotation, replay detection, and revocation. Local JWT signature verification alone does not consult current revocation state. Our choice makes revocation depend on a server lookup rather than introducing a second credential lifecycle. This is a scope/operational judgment, not a claim that JWT is inherently insecure. [JWT security guidance](https://www.rfc-editor.org/info/rfc8725/).

Authentication answers who the caller is; authorization answers whether that caller may perform an operation. Anonymous/authenticated are access states here, not business roles. If later features introduce admin-only actions or user-owned records, define role/ownership policies before adding their endpoints. A valid session alone would not authorize all future business operations. [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

### Route access matrix

| Route/resource | Access policy |
| --- | --- |
| `POST /api/auth/signup` | Public; strict validation, mutation controls, signup throttling |
| `POST /api/auth/signin` | Public; mutation controls and throttling; verify credentials before issuing session |
| `GET /api/auth/me` | Require valid session; return only that session owner's public user |
| `POST /api/auth/logout` | Public with optional presented session; preserve CSRF controls and idempotence; revoke only the presented token |
| `GET /api/health` | Public; safe readiness response |
| Any new matched API handler | Authentication required by default; define its business access policy before implementing it |
| Unknown `/api/*` resource | API 404; never SPA HTML |
| SPA HTML/static assets | Public; no private user data embedded; browser verifies session before protected UI |

Register SessionGuard as an application-wide Nest guard using `APP_GUARD`. Use an explicit local `@Public()` metadata decorator only on the public handler methods above. Never mark the entire AuthController public because `/auth/me` shares it. `@Public()` skips only session authentication; request-origin rules, body restrictions, throttling, validation, and logging still apply. The pattern does not require Passport, a JWT module, or an additional auth framework. [Nest authentication guidance](https://docs.nestjs.com/security/authentication).

Static serving remains outside protected API handlers. If SPA fallback is a Nest controller, explicitly mark only its browser GET routes public and exclude `/api`. Do not expose a public catch-all for API requests. Avoid a server-side authentication cache: each protected request resolves the authoritative session according to A10. The browser's in-memory query cache in A11 is presentation state, never server authorization evidence.

Reconsider JWT if independent services need locally verified claims; reconsider renewal if longer signin persistence becomes a requirement; introduce RBAC only when distinct allowed actions exist. Mobile/external clients require a transport/protocol review but do not automatically require JWT. Any such change updates this decision, the data/API contracts, and acceptance checks before implementation.

## A10 — ACID, consistency, and transaction boundaries

ACID describes atomicity, consistency, isolation, and durability of database work. The application must define which operations need those guarantees; declaring a database “ACID” does not make an entire HTTP request atomic.

| Property | How this application applies it | Boundary |
| --- | --- | --- |
| Atomicity | One account insert, one session insert, or one session deletion is a single-document write | Database state and HTTP/cookie delivery are not one atomic operation |
| Consistency | Shared validation, typed required persistence fields, unique normalized-email/token indexes, expiry checks, and user-existence checks preserve declared invariants | MongoDB does not infer business rules or provide an automatic foreign key for `session.userId` |
| Isolation | Atomic writes prevent partially updated documents; unique indexes resolve concurrent duplicate signup | Separate user/session reads do not share a transaction snapshot; no claim of whole-request serializability |
| Durability | Success follows the acknowledged/journaled write policy below | A single-node development set has no redundant copy; an unknown acknowledgment is not proof of rollback |

MongoDB provides single-document write atomicity and supports multi-document transactions when an operation needs a wider atomic boundary. [MongoDB atomicity and transactions](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/).

### Transaction decision

**No multi-document transaction is needed for the current flows.**

| Flow | Database steps | Atomic write boundary |
| --- | --- | --- |
| Signup | Validate/hash, then insert one user; no automatic signin | User document |
| Signin | Read user and verify password, then insert one independent session | Session document; preceding read is separate |
| Session check | Read session, check expiry, read existing public user | No mutation; two reads with no shared snapshot |
| Logout | Delete the presented session; confirm revocation | Session deletion |

There is no password-change, account-deletion, organization-membership, or coupled user/session-creation use case. Add a transaction only if a future requirement needs an all-or-nothing change across documents, and test its retry/failure behavior. Even automatic signin after signup needs a transaction only if both records must succeed together. Multi-document transactions require a supported replica-set/sharded deployment. [MongoDB transaction deployment requirements](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/).

### Database topology and concern policy

Use a **single-node replica set in local development and CI**, so actual integration tests exercise the selected concern settings. Compose still runs one database server; add idempotent replica-set initialization and wait for a writable primary. Use replica-set discovery with an advertised hostname reachable by the application/test runner; a ping-only health check is insufficient. Production configuration targets an external replica set; provisioning it remains outside this assignment. A standalone connection or weakened concern settings must not be silently accepted.

| Setting | Selected policy |
| --- | --- |
| User reads | Primary read preference; majority read concern |
| Writes | Majority acknowledgment and journal acknowledgment; 5-second write-concern wait budget |
| Session authorization read | Primary, linearizable lookup by immutable unique tokenHash, with `maxTimeMS: 5000`; check expiry after the read |
| Driver retryable writes | Enabled where supported; do not wrap application POSTs in automatic retry loops |
| Failure bounds | Initial server-selection budget 5 seconds; individual read budget 5 seconds; socket timeout 10 seconds; verify pinned driver option names and behavior at M1 |
| Database client sessions | Do not attach authorization reads to causally consistent client sessions; they are distinct from our application login sessions |

The connection adapter explicitly applies this policy and validates required topology/configuration. Keep it centralized. In server terminology the write concern is `{ w: "majority", j: true, wtimeout: 5000 }`; use the pinned driver/Mongoose API's corresponding options. Journal acknowledgment and replica acknowledgment address different durability risks. A write-concern timeout does not bound the entire request or undo a write already applied. [MongoDB write concern](https://www.mongodb.com/docs/manual/reference/write-concern/).

The stronger read is limited to session authorization/revocation confirmation. Majority reads alone can return older committed state; a uniquely keyed linearizable read observes successful majority writes completed before that read starts. It costs additional latency and must fail with a safe 503 when its guarantee cannot be established. On the local single-node set, M2 observed roughly 0.1 s per authenticated `/auth/me` request, against single-digit milliseconds for the logout delete. Use the existing unique tokenHash index; do not join the session/user reads into an aggregation that loses this targeted boundary. [MongoDB linearizable reads](https://www.mongodb.com/docs/manual/reference/read-concern-linearizable/).

After an acknowledged deletion of an existing session, subsequent authorization checks reject it. If `deleteOne` reports zero matches, confirm absence with the same authoritative tokenHash lookup before returning logout success; do not turn an earlier uncertain write into a claimed confirmation through an unverified no-op. Never reuse a revoked token value. Checks already completed before logout can still authorize in-flight work.

The database login-session collection and MongoDB driver sessions are unrelated concepts. Normal implicit driver sessions do not require application-level causal sessions. Verify the pinned driver's configuration in integration tests rather than weakening the read concern on failure.

### Ambiguous failures and evidence

- Signup availability, timeout, or uncertain-acknowledgment failure returns a safe 503 without asserting that no account was created. A later explicit retry may conflict; signin may succeed. A recognized duplicate-email conflict remains 409; an unexpected internal failure remains 500 under A05.
- Signin sets a cookie only after confirmed session insertion. An inserted session whose acknowledgment is lost may remain unused until TTL cleanup.
- Logout acknowledgment failure does not clear the cookie or claim revocation; a later retry/check reconciles the result. Do not promise that the session definitely remained active either.
- A lost HTTP response can occur after a successful write. Never delete an account as compensation for response delivery failure, and do not claim exactly-once HTTP execution.
- Database driver retryable writes are different from automatically retrying browser POSTs. Review the pinned driver's supported retry behavior. [MongoDB retryable writes](https://www.mongodb.com/docs/manual/core/retryable-writes/).

Test real single-node replica-set operations plus injected “write not applied” and “write applied but acknowledgment lost” cases. Record the verified topology. Such tests establish application behavior and concern compatibility; they do not certify multi-node failover, disaster recovery, backups, or replicated availability. Do not imply that a database restart test proves all durability/failover guarantees.

## A11 — Frontend packages and state ownership

Adopt React Hook Form and TanStack Query for the existing screens. Their value is replacing repeated form/request lifecycle code with defined ownership. They do not change the API, opaque session cookie, authorization policy, or product scope. Pin compatible stable React/TypeScript/Zod/resolver/Query versions together at M1 and verify integration; package selection alone is not evidence of correctness.

| Concern | Owner | Rule |
| --- | --- | --- |
| Form values, touched state, validation errors, submission pending | Component-local React Hook Form instance | Do not mirror field values in useState or context |
| Input policy and normalized submit types | Shared Zod schemas through `zodResolver` | Backend applies the same policy independently |
| Session response and request lifecycle | One stable QueryClient; `['auth', 'me']` query | Cache only PublicUser or null; no credentials or persistence |
| Auth actions and derived UI status | Small auth provider/coordinator | Expose actions and derive status from query state plus workflow flags; no second user store |
| HTTP transport | Typed native fetch client | Decode/check HTTP status, produce safe errors, send required headers, handle timeout/AbortSignal |
| Password visibility and other local UI details | Component-local React state | Keep state near its consumer |

### Forms

Use native inputs with `register`, `zodResolver`, and schema-derived input/output types so email/name transformations remain explicit. Use `Controller` only if a genuinely controlled widget requires it. Configure touched/blur validation with correction feedback (`mode: 'onTouched'`, `reValidateMode: 'onChange'`), validate all fields on submit, focus the first invalid field, and map recognized server field errors with `setError`. Clear obsolete server errors when relevant input changes or a new attempt begins. Use form `noValidate` so native validation does not override the shared Unicode rules; keep accessible input types and autocomplete attributes. The resolver supports inferred schema output and explicit input/output types. [Official Zod resolver integration](https://github.com/react-hook-form/resolvers#zod).

Await the complete auth action in `handleSubmit` so `isSubmitting` covers the request. Keep passwords only in the local form and transient request arguments; do not retain them in context, query keys, mutation variables, cached errors, logs, or persistence. Clear on successful navigation/unmount, preserving input on recoverable errors as Experience specifies.

### Session queries and transitions

- Keep one stable QueryClient per browser application. The session query returns PublicUser on 200 and null only on `/auth/me` 401; other HTTP/network failures throw typed errors. A signin 401 remains a form error, not a session-query result.
- Explicit session options: `staleTime: 0`, `retry: false`, no polling, and `networkMode: 'always'` with the bounded fetch timeout. Offline checks therefore settle as unavailable instead of remaining paused indefinitely. Enable mount/focus/reconnect rechecks; the coordinator requests navigation revalidation through the same query and deduplicates overlapping work. Do not add a separate focus listener or component fetch effect for the same request. These choices override documented query defaults deliberately. [Query defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults), [network modes](https://tanstack.com/query/latest/docs/framework/react/guides/network-mode).
- Derive checking/authenticated/anonymous/unavailable according to Experience. Cached data alone must not expose protected content while a required check is pending or has failed. Staleness is a refetch policy, not automatic logout; a successful result remains usable until the next required verification or auth transition. Public forms stay mounted during background checks.
- Consume Query's AbortSignal in fetch. Before signin/logout, suspend new session checks and await cancellation of existing ones; use an operation generation or equivalent guard against obsolete completions. Re-enable checks after settlement and honor any required navigation/revalidation. Cancellation stops local handling; it does not reverse server work. [Query cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation).
- Confirmed signin replaces the cached identity with the returned PublicUser and clears any previous user's scoped data. Confirmed logout clears user-scoped data and sets the session result to null. Neither transition is optimistic. Failed logout shows its error without claiming signout; later verification reconciles uncertain outcomes. A confirmed session 401 also clears user-scoped data.
- Keep query/mutation caches in memory only. No persisted/dehydrated auth state, offline mutation queue, or automatic POST retry. Cookies remain managed by the browser; Query never receives the session token.

### Credential submissions and mutations

TanStack mutations retain variables as mutation state. To preserve our local-password boundary, signup/signin use awaited auth-coordinator actions calling the API client directly; React Hook Form owns their pending/error presentation. The coordinator uses QueryClient for session cancellation/cache updates without storing credential arguments. This is a narrow policy for credential submissions, not a general rejection of `useMutation`. [Mutation API and retained state](https://tanstack.com/query/latest/docs/framework/react/reference/functions/useMutation).

Use `useMutation` for credential-free logout, with `retry: false` and `networkMode: 'always'`; invoke it through the coordinator and prevent duplicate active actions. Transport timeout/network failure gives manual recovery, not deferred replay on reconnection. Future non-secret writes can use mutations if separately in scope. Do not introduce a credential vault or custom mutation framework to force every request through the same hook.

### Dependency boundaries

Keep React Router, CSS Modules, shared Zod, and native fetch. No present requirement justifies Redux/Zustand, Axios, a full UI kit, or another validation library. Add a dependency when it solves a concrete requirement and its maintenance, compatibility, accessibility, and bundle cost are justified. Development checks include strict TypeScript, React Hooks lint rules, React Testing Library with user-event where useful, and the planned Playwright journeys; developer tools must not expose actual credentials.
