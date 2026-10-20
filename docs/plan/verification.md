# Acceptance and Evidence

Return to [PLAN.md](../../PLAN.md). Requirements are defined in [Requirements](requirements.md); precise behavior is in [Architecture](architecture.md) and [Experience](experience.md).

**Current evidence state: M1 foundation verified locally on 2026-10-20.** T01 passes; the assigned M1 setup portion of T12 passes while T12 remains Pending overall. Authentication, user/session persistence, browser journeys, CI, release preparation, and submission are not implemented or verified. Acceptance criteria below remain unchanged; actual evidence is recorded separately.

## Test strategy

Use shared-schema tests for meaningful boundary examples, API integration tests through the real Nest HTTP stack and isolated databases on a single-node MongoDB replica set, and a small Playwright suite for the full browser journey. Add focused React tests only where an important state/race is difficult to cover at the browser/API level. Mock dependency failures deliberately; do not replace real MongoDB for ordinary persistence, uniqueness, or session tests.

Use independent fixtures and explicit time control for expiry; do not wait 24 hours or wait for a TTL monitor. Browser tests use accessible roles/labels and isolated contexts. Automate behavior users or callers depend on, not implementation details. [Playwright testing guidance](https://playwright.dev/docs/best-practices).

Test cleanup must be limited to generated test databases owned by the current run. Never drop the configured application database. Pin test tools and service versions, reset or configure throttling for unrelated tests, and run dedicated rate-limit checks with real enforcement enabled. Use clear readiness checks instead of arbitrary sleeps.

## Acceptance matrix

| ID | Acceptance criteria | Method | Covers |
| --- | --- | --- | --- |
| T01 | Pinned workspace installs; React/TypeScript and Nest/Mongo are real dependencies; strict typecheck, lint, shared imports, and production builds succeed | Tooling/build smoke | R01, R05 |
| T02 | Valid signup returns 201/public user; exactly one persisted normalized account exists; password is hashed; signup creates no session; correct signin succeeds afterward | API + Mongo inspection | R02, R05, R06 |
| T03 | Signup boundaries and malformed payloads are rejected by the server independently of the UI; shared browser behavior matches; valid boundaries succeed | Table-driven schemas + representative direct API requests | R02, R06, B02, B06 |
| T04 | Equivalent normalized emails conflict; simultaneous signup requests create exactly one user, with one 201 and one 409; required indexes exist | Concurrent API + Mongo | R11 |
| T05 | Correct credentials return 200/public user and fresh session cookie; unknown email and wrong password share the same safe 401 response; signin does not impose signup composition checks | API | R03, R06, R11 |
| T06 | `/auth/me` returns only the valid session owner's user; API authentication is required by default; expiry/malformed/revoked/missing tokens and missing users fail; confirmed logout rejects subsequent replay and is idempotent | API + replica-set Mongo + controlled expiry fixtures | R05, R07, R11, B01 |
| T07 | Mutation Origin/header/content-type policy enforced; no state change on rejection; cookie/cache/security headers and production config are correct; throttling returns 429/Retry-After | Integration + configuration checks | R11 |
| T08 | Safe errors for validation, parsing, conflicts, oversized input, rate limits, database outage, uncertain write acknowledgment, and unexpected failures; logs/responses omit sensitive values; no false rollback/success claims | API fault injection + log capture | R06, R11, B04, B06 |
| T09 | Browser signup → signin → exact welcome message → refresh → logout works; direct `/app` access is protected before and after logout; API rejects revoked cookie | Real browser + API | R02–R04, B01, B02 |
| T10 | Pending/error/retry/expiry states are truthful; duplicate clicks do not duplicate active requests; session outage does not become anonymous; stale requests cannot undo signin/logout | Focused browser/component tests | B01, B06 |
| T11 | Screens usable with keyboard, expected labels/autofill, visible focus, readable errors, 200% zoom, and specified screen widths | Recorded manual review; optional targeted automated accessibility checks | Chosen UX baseline |
| T12 | Clean setup initializes the local replica set and verifies configured concerns; data/session persist across API restart; built assets/direct SPA routes work; `/api` does not return SPA HTML; incompatible config fails safely; preview/topology limits stated | Fresh setup + runtime smoke | R01, R05, R08, R11 |
| T13 | CI definition runs locked install, checks, tests, browser journey, and build with isolated MongoDB; actual submitted revision receives a passing remote run | Workflow review + GitHub run | B03 |
| T14 | README accurately documents actual commands, API, config, limits, and setup; AI.md has truthful concrete assisted areas, prompts/approaches, corrections, decisions, and validation | Documentation review + README walkthrough | R08, R10, B05 |
| T15 | Public repository contains final code, README, AI.md and selected artifacts; final revision accessible; recruiter link handoff performed/confirmed | Repository inspection + handoff record | R09 |
| T16 | Final review finds no unresolved requirement/security defect; Engineering E01–E06 responsibilities and SOLID criteria hold; secrets/brief copies/generated artifacts excluded from public tracked files; limitations disclosed | Code/diff/config review | R11, B04 |

## Detailed validation examples for T03

- Email: malformed format; empty string; missing value; leading/trailing spaces; normalization consistency across signup/signin; over 254 characters; wrong types and operator-shaped objects.
- Name: 2 versus 3 characters after trimming; all spaces; 100 versus 101 characters; international characters and internal spaces.
- Password: 7 versus 8 characters; 128 versus 129; independently missing letter, number, or punctuation/symbol; whitespace alone as the supposed special character; international letters/digits and symbols under the chosen Unicode rules.
- Verify exact preservation of password whitespace and characters during hashing/signin; no silent normalization/truncation.
- Request structure: missing each field, extra properties such as `role`, arrays, null, nested objects, malformed JSON, unsupported content type, and an oversized body.
- Signin composition is not signup composition: malformed/empty/overlong inputs get validation errors; a nonempty short or composition-failing password gets the generic credential failure rather than a signup-policy message.

These examples are shared policy coverage; use a compact parameterized suite and a representative direct HTTP subset to establish that server validation is actually attached. Do not create redundant tests for every schema implementation branch.

## Security and lifecycle details for T06–T08

- Cookie raw token is not stored in MongoDB, logged, returned in JSON, or written into browser storage. Session token hashes and password hashes are distinct mechanisms.
- Inspect the encoded password hash to verify Argon2id and at least the selected cost parameters; verify password matching through the library. Confirm the stored session verifier is SHA-256 of the presented raw cookie token, rather than merely a value different from that token.
- Production cookie includes Secure/HttpOnly/SameSite=Lax/Path=/ with the host-prefix name and no Domain. Local cookie differs only as documented; deletion uses matching attributes.
- New signin issues a fresh unpredictable token. Failed authentication does not establish a session.
- Session-check responses never set or delete cookies, including 401 responses, so a delayed old check cannot erase a newly issued login cookie.
- Refresh and API restart preserve a valid session; expiry/revocation/missing user return 401. Cookie expiry and server expiry align.
- Logout waits for session deletion. A forced deletion failure returns 503 and the UI does not claim successful logout. Missing/already-invalid sessions can be logged out idempotently.
- Missing/null/wrong Origin, missing/wrong custom header, or disallowed body type prevent every mutation, including signup/signin/logout. Valid same-origin JSON requests succeed. Non-browser API examples supply the required headers.
- Unique-email enforcement remains correct under concurrency. Validation rejects object/operator injection attempts before query construction.
- Rate limiting is per route/IP as documented; spoofing an untrusted forwarding header does not bypass it. No assertion of protection against distributed attacks is made.
- Simulated Mongo outage is a 503, not invalid credentials or a successful write. Unexpected failures produce safe 500 responses with correlation IDs.
- Capture representative error/event logs and responses to check that raw input, passwords, hashes, cookies, tokens, and connection secrets do not appear.

## Authorization and consistency checks

- Test a private handler without an explicit public marker and every planned public exception. A public marker skips only session authentication; mutation restrictions still apply. Keep any test-only handler out of production builds.
- Create two users/sessions and prove each `/auth/me` result is its own owner. Browser-supplied user IDs/roles never change the selected identity; unexpected signup/signin body properties are rejected.
- Verify public SPA assets/direct routes work and unknown API paths return 404 rather than HTML. No whole-controller public annotation may expose `/auth/me`.
- Verify the selected replica-set topology, unique indexes, majority/journal writes, primary user reads, and targeted linearizable session lookups with bounded query time. Unsupported/unsafe configuration fails; test-only weaker settings must not conceal a real incompatibility.
- For logout, test an existing-session deletion and the zero-match/confirmed-absence path, repeated logout, and a session check begun after confirmed deletion. Do not assert that logout cancels a request already authenticated before deletion.
- Simulate both a rejected write and a write applied before acknowledgment was lost. Signup may have created an account; signin must not issue a new cookie without confirmation; logout must not falsely clear the cookie/announce success. These tests belong to T08 rather than a new retry framework.
- Record single-node replica-set integration as concern-compatibility/application evidence. Multi-node failover, disaster recovery, and redundant durability remain unverified unless actually exercised; they are not part of this assignment's test gate.

## Clean-code review for T16

Review [Engineering](engineering.md) against the implementation: HTTP adapters do not query the database or hash passwords; services have clear ownership and one-way dependencies; public responses are explicit projections; validation/security policies have one owner; failures preserve their documented meaning; injected replacements respect real contracts. Confirm descriptive names, strict types, justified abstractions, and comments for non-obvious policy. No forced inheritance, boilerplate interface hierarchy, swallowed errors, or broad unsafe assertions should be needed.

For A11/E05, confirm one stable QueryClient, no duplicated user/form state, schema-derived form types, credential-free query keys/mutation state/errors, and no persisted auth cache. Check Hooks linting, event-driven submissions, and that expected async failures are handled separately from the rendering error boundary. T01 verifies compatible package integration; T03 verifies the resolver uses the same normalization and validation policy as the API.

## Browser and manual evidence

The minimum real-browser suite covers the full valid journey, anonymous direct application access, refresh/session restoration, and logout. Add focused cases for invalid credentials, service-unavailable retry, and a stale session response racing a successful auth mutation. Verify background focus checks preserve public form inputs and navigation checks honor signin/signup redirects after another tab authenticates. Use independent accounts/contexts so tests do not depend on execution order.

Under T10, verify cached user data cannot expose protected content during required revalidation or after failure; confirmed logout/401 clears user-scoped data; late queries cannot overwrite a newer auth action. Offline checks must settle as unavailable, and offline POSTs must fail without replay on reconnect. Check correction of field/server errors, awaited submit pending state, and absence of passwords from QueryClient query/mutation caches after a credential submission using synthetic test values. Exercise simultaneous focus/navigation triggers to confirm deduplication and preserve mounted public forms.

Record manual checks of mobile/desktop widths, keyboard navigation, focus after errors/navigation, password visibility/autofill, readable pending states, zoom, and exact welcome text. A short observation plus screenshot where useful is enough; do not create snapshot tests for low-impact styling.

Distinguish three kinds of runtime evidence: development flow via Vite proxy, compiled local preview, and production-configuration cookie/header checks. Unless an HTTPS environment was actually exercised, do not claim deployed TLS/proxy behavior was verified.

## Evidence ledger

For each entry record the date, revision (or local snapshot), command/manual steps, outcome, and link to a useful report or concise observation. Do not paste secrets or entire noisy logs. Use **Pending**, **Pass**, **Fail**, or **Blocked**; skipped work is not a pass.

| Check | Status | Evidence / next action |
| --- | --- | --- |
| T01 | Pass | 2026-10-20 local M1 snapshot: pinned Node 24.22.0/npm 12.2.0; locked `npm ci --no-audit --no-fund`; `npm ls --depth=0`; `npm run check:foundation` passed strict typecheck, lint/format, 41 tests, shared ESM imports, and contracts/API/web builds. Real React, Nest 12, Mongoose/Mongo integration; details below |
| T02 | Pending | Implement signup persistence |
| T03 | Pending | Implement shared validation and server enforcement |
| T04 | Pending | Implement/verify unique index and race handling |
| T05 | Pending | Implement signin |
| T06 | Pending | Implement session lifecycle and protected endpoint |
| T07 | Pending | Implement request/security controls |
| T08 | Pending | Implement safe errors/logging and failure fixtures |
| T09 | Pending | Implement browser journey |
| T10 | Pending | Implement and verify UI states/race handling |
| T11 | Pending | Review implemented UI |
| T12 | Pending | M1 setup portion passed: first initialization and repeated setup, discovery/primary/concern compatibility, readiness/outage, config/index gate failure, compiled preview/routes/API 404s. Auth/session persistence, final production controls, and M5 clean-checkout README walkthrough remain unrun |
| T13 | Pending | Implement workflow; observe remote result when available |
| T14 | Pending | M1 README and actual AI record updated; final auth/API documentation and clean-checkout walkthrough still required |
| T15 | Pending | Perform authorized public submission/handoff |
| T16 | Pending | Initial M1 source/config review and ignore checks completed; final authentication/security/responsibility and release-artifact review remain required |

## M1 local evidence — 2026-10-20

Snapshot: the M1 foundation files committed with this record on local `main`. Platform: macOS arm64; Node 24.22.0/npm 12.2.0 selected from a temporary tool directory (host globals remain unchanged). Docker Desktop 28.0.1/Compose 2.33.1; MongoDB image `mongo:8.0.32@sha256:d0d926f94df099bff534b7ee5b5986458131a22489dfff8664509af0c1e2ca9c`. No remote revision or CI run exists.

| Portion | Actual command / method | Result |
| --- | --- | --- |
| Dependency compatibility/install | Queried npm engines/peer metadata; inspected generated Nest 12 ESM config; `npm ci --no-audit --no-fund`; `npm ls --depth=0` | Pass: 412 locked packages installed; core Nest majors aligned; compatible React/RHF/resolver/Query/Zod; TS 6.0.3 selected to satisfy lint peer range; no global runtime replacement |
| Complete available gate | `npm run check:foundation` after the locked reinstall | Pass: lint/format, all workspace/test strict typechecks, 41 tests, ordered production builds |
| Compiler/library smoke | `packages/contracts/src/index.test.ts`, `apps/api/test/tooling.test.ts`, web test files | Pass: 6 shared health-schema tests; 3 Nest DI/shared standard-schema validation/native Argon2 tests; 4 jsdom readiness/RHF-resolver-Query tests. Test-only mutation/form fixtures are not exposed as product features |
| Config safety | `apps/api/test/config.test.ts`; compiled-startup subprocess assertions | Pass: 24 config tests; exact origin/production HTTPS, port/boolean/proxy/topology/policy rejection. Actual compiled server exits 1 with generic output for unsafe production origin, unavailable DB with a dummy credential marker, and missing web HTML; marker not logged |
| Initial database setup | `docker compose up -d`; `npm run db:ready` | Pass after resolving occupied port 27017 to 27018 and correcting shell/API details: initialized one member, waited for writable primary, discovered it from host without direct connection |
| Idempotence and initialization scope | Repeated `npm run db:ready`; inspect `rs.conf()` and `db.hello()`; invoke initializer with external URI | Pass: `easy-generator-rs`, `localhost:27018`, configuration version 1 remained unchanged, writable true; external target rejected before initialization |
| Connection/read-write policy and startup hook | `apps/api/test/database.integration.test.ts` with a generated owned DB | Pass: 4 real DB tests; inherited primary/majority and majority+journal/write budget options inspected; actual insert/read/linearizable lookup/delete/absent lookup succeed; index-hook failure blocks readiness; closed connection yields safe health 503 |
| Test isolation | `apps/api/test/test-database.ts`; inspect generated database names after suite | Test helper requires dedicated marker URI distinct from app DB, creates a UUID database, and permits cleanup only of that exact owned name. It never drops the configured application DB; setup failure does not count as a skipped pass |
| Live development stack | `npm run dev`; HTTP requests through `http://localhost:5173`; watcher output | Pass: HTML 200, proxied health 200, unknown API JSON 404, contracts/API/web watchers active; rebuilt contracts triggered web update/API restart |
| Live outage | Stop only project Mongo container, request proxied health, restart/setup, request health | Pass: `503 {\"status\":\"unavailable\"}` without infrastructure details; restart/setup restored `200 {\"status\":\"ok\"}`. The dev watcher also restarted during rebuild; this does not prove uninterrupted API-process recovery or auth persistence |
| Compiled preview | `npm run preview`; Node HTTP assertions for `/`, `/signin`, `/signup`, `/app`, assets, `/api`, `/api/unknown`, `/api/health/unknown`, `/api/health` | Pass: direct routes serve built HTML, referenced JS loads, missing JS returns empty 404, API misses return JSON 404, health uses real DB. This proves static routing only; auth screens/guards are not implemented |
| Local artifact preparation | `git check-ignore` for real env, brief copies, dependencies, dist; `git diff --check`; formatting check | Pass for M1 preparation; final M5 tracked-artifact and fresh-checkout gates remain Pending |

Earlier unsuccessful attempts were corrected and rerun: initial API HTTP tests hit sandbox `EPERM`; Docker's default port conflicted with an existing service; the initializer initially used the wrong shell port/options field and treated NotYetInitialized as a returned result instead of a thrown error; command-level timeout options needed the pinned driver's `timeoutMS`. No failed/skipped attempt is counted as passing evidence. No security audit, real-browser auth journey, deployed HTTPS, multi-node failover, remote CI, or recruiter handoff was performed.

## Release gates

**Locally ready for publication:** T01–T12, T14, T16 pass; CI workflow configuration is reviewed and local equivalent checks pass. T13's remote run and T15 remain explicitly pending if no remote exists.

**Submitted:** all selected checks including the remote CI run pass for the submitted revision, and the required recruiter link handoff is confirmed. Any unresolved functional/security issue prevents claiming completion. The brief's original requirements cannot be dropped as a time-saving change.

## Planning-only evidence

- Read the complete PDF conversion and mapped its explicit requirements, optional features, and evaluation expectations.
- User confirmed React/TypeScript and a clean, minimal, professional UI.
- Independent reviews covered requirement completeness, UX states, and architecture/security choices.
- Checked the planning files for local-link integrity, requirement/check references, and contract consistency.
- Reviewed official React, React Hook Form resolver, and TanStack Query guidance; aligned A11 package/state decisions with implementation order and acceptance checks. No dependency installation or application execution occurred.

These checks validate the planning documents only. They do not change any application check above from Pending.
