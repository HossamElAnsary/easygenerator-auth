# Delivery Plan and Progress

Return to [PLAN.md](../../PLAN.md). This document owns milestone status and plan changes. [Verification](verification.md) owns evidence of working behavior.

## Execution rules

- Finish the current milestone's exit gate before marking it verified or treating its dependencies as ready.
- When a check spans milestones, record evidence for the completed portion but leave the overall check Pending until all its acceptance criteria pass. A milestone can close on its explicitly assigned portion without claiming the whole check passed.
- Build a working path through storage, API, and browser early. Add security controls with the relevant behavior, not as a final cosmetic pass.
- Run focused checks while changing a feature; run the combined suite at the integration/release gate. Rerun broader checks when new changes or failures justify it.
- Keep AI.md current using actual prompts, corrections, files, and check results. Never reconstruct a fictional contribution history at the end.
- Commit coherent milestones once implementation is requested and Git is initialized. Do not publish or message a recruiter during planning.
- Before any eventual external action, use the user's then-current authorization. Ask for missing destination/contact details or approval only if the existing instruction does not already authorize the action.

## Milestones

Statuses: **Planned**, **In progress**, **Verified**, **Blocked**. Blocked entries must state the concrete issue and next action. The optional planning state “baseline prepared” does not claim the user approved every technical choice.

| Milestone | Dependency | Planned work and exit gate | Status |
| --- | --- | --- | --- |
| M0 — Planning | Brief and preferences | Scope, contracts, UX, delivery, acceptance, and AI record are consistent and reviewable | Verified: documentation only |
| M1 — Foundation | M0; instruction to implement | Workspace, pinned tools, Mongo, startup config, shared contracts, and minimal web/API compile/run/test smoke | Verified: T01 and M1 setup portion of T12; full T12 remains Pending |
| M2 — Authentication API | M1 | User/session persistence, hashing, signup/signin/me/logout, request controls, and direct API tests pass | Verified: T02 and T04–T08; T03 schema/API portions (browser parity closed at M3); M2 portions of T12 and T16 |
| M3 — Browser journey | M2 contract; UI shell may start after M1 | Three pages, session states, errors, and complete browser journey work | Verified: T03 browser parity, T09, T10; initial T11 review recorded (full T11 remains Pending M4) |
| M4 — Quality gate | M2, M3 | Meaningful integration/browser checks, responsive/accessibility review, safe logs, production build review, and CI are complete | Planned |
| M5 — Submission ready | M4 | Fresh-checkout README walkthrough, accurate AI record, evidence review, and publication-ready tracked files | Planned |
| M6 — Submission | M5; authorized submission action and destination details | Public GitHub revision verified and recruiter link handoff actually performed | Planned |

The dependency path is M1 → M2 → M3 integration → M4 → M5 → M6. After M1, the UI shell and backend work can run in parallel against the frozen contracts; shared-contract edits must be coordinated. Do not parallelize competing edits to the same contract or use a UI mock as proof that the backend works.

## Current handoff — 2026-10-21 (after M3)

- **Completed:** M0–M3. M3 implementation is revision `0fa1348` on local `main`. The typed client, stable session query/coordinator, signup/signin/application routes, recovery states, accessible fields, rendering boundary, and real browser suite are implemented. `npm run check` passed lint/format, strict typecheck, **239 workspace tests (73 contracts, 128 API, 38 web)**, builds, and **10 Chromium tests**.
- **Unfinished:** M4–M6 remain Planned. T01–T10 pass. T11–T16 remain Pending, with initial T11 and existing T12/T14/T16 portions recorded. No CI, final security/release gate, public repository, or recruiter handoff is claimed.
- **Decisions to retain:** baseline v1.2 and M2's contract clarifications; React/RHF/shared Zod/TanStack/native fetch; opaque HttpOnly sessions; read-only session checks; exact origins (`http://localhost:5173` dev, `http://localhost:3000` compiled test/preview); production rate limits 5/10/30/120. No API or shared schema changed for the UI.
- **Runtime and test setup:** Node 24.22.0/npm 12.2.0 are now installed in nvm; use `source ~/.nvm/nvm.sh && nvm use` in this shell, or select the pinned versions with your version manager. Docker's project replica set remains on 27018; 27017 was untouched. Recheck `npm run db:ready` before resuming. Playwright 1.64.1 / Chromium 1248 download is in ignored `.cache/ms-playwright`; README includes installation and test commands. Browser cases own port 3000 and create/drop only their own generated databases. The last data-hygiene check found no generated test databases.
- **Blockers:** none for M3. Native browser 200% zoom and actual password-manager/autofill behavior remain part of the full M4 T11 review. M3 verified keyboard behavior, semantic autofill attributes, specified widths, and a CSS 200% enlargement probe without claiming those remaining manual checks passed.
- **Next concrete task:** when M4 is authorized, begin its quality review from the recorded M3 evidence, complete T11's remaining manual cases, review production controls and logs, then add the pinned-runtime/MongoDB GitHub Actions workflow. There is still no Git remote; publication and recruiter communication remain M6.

## M1 — Foundation tasks

1. Inspect installed Node/npm, Docker or available MongoDB, Git, and current workspace state. Choose compatible stable package versions and a pinned MongoDB image; record them in runtime files, manifests, and README.
2. Initialize the repository when implementation starts; preserve the brief locally. Set ignore rules for source brief copies, actual secrets/env files, generated output, dependencies, database files, and test artifacts.
3. Create npm workspaces for web, API, and shared contracts. Configure strict TypeScript, formatting/linting, and scripts with a deterministic build order.
4. Prove a shared schema import works in browser and API builds; prove Nest DI and the selected test compiler work. Resolve tooling compatibility before adding application complexity.
5. Add safe example environment, configuration validation, and the Mongo connection/readiness pipeline. Set up one local Mongo server as a single-node replica set, with idempotent development/test initialization and the read/write policy from A10. Verify concern compatibility and wait for a writable primary; do not silently fall back to standalone mode. Initialization must not reconfigure an existing or externally managed replica set.
6. Establish the startup hook for future index verification. Define and verify the actual user/session indexes in M2 after their schemas exist, before exposing auth endpoints.
7. Start the web/API/Mongo stack, confirm `/api` proxying, compile the web/API, and check readiness behavior. Add a short initial README and actual AI.md notes.

Exit evidence: T01 and the applicable setup portions of T12. No placeholder authentication is counted as a feature.

### M1 result — 2026-10-20

Completed in the documented order: inspected planning-only workspace/tools; initialized Git and ignore rules; established pinned npm workspaces and strict tooling; passed shared-import/Nest DI/validation/Argon2/frontend-package smoke before database integration; added validated configuration, real replica-set connection policy, explicit awaited index hook, development proxy, and compiled static preview. No material baseline contradiction was found. Exact versions are in manifests/lockfile, `.nvmrc`, Compose, and README.

Actual verification on the local M1 snapshot:

- `npm ci --no-audit --no-fund` installed 412 packages with Node 24.22.0/npm 12.2.0; `npm ls --depth=0` exited successfully with the pinned workspaces and no extraneous packages.
- `npm run check:foundation` passed lint/format, strict typecheck, all 41 tests (6 contracts, 31 API, 4 web), and ordered production builds.
- `docker compose up -d` and repeated `npm run db:ready` verified writable `easy-generator-rs`, host discovery, and unchanged replica-set configuration version 1. Compose uses Mongo 8.0.32 with a digest and loopback port 27018.
- Live `npm run dev`/HTTP checks verified Vite → `/api/health`, served HTML, JSON API 404s, contract-change watcher propagation, and safe 503 during a project-database stop. Database restart/setup restored readiness.
- `npm run preview`/HTTP assertions verified compiled HTML/direct browser routes, built JavaScript, empty 404 for a missing asset, JSON 404 for unknown API routes, and real health. Compiled startup rejected unsafe production origin, unavailable DB, and missing assets; the initializer rejected an external target.
- `.env`, both brief copies, dependencies, and compiled output were confirmed ignored. `git diff --check` and final formatting passed.

Resolved setup issues: host runtime was below the generator floor; temporary pinned tools avoided global changes. TypeScript 7 was incompatible with the selected lint tooling, so TS 6.0.3 was pinned. Port 27017 was occupied and left untouched. Initial Mongo shell/driver option mismatches were corrected against the actual pinned interfaces before recording passes. Sandbox-denied loopback/API test execution was rerun with authorized access.

No M1 blocker remains. The local Mongo volume is retained; development/preview processes were stopped after checks. M2 is next: auth input schemas, user/session models and indexes, request controls, password/session services, guarded endpoints, and direct API verification. No authentication or browser-journey feature, CI, publication, or submission is included in M1.

## M2 — Authentication API tasks

1. Implement the shared strict input schemas, public response types, and typed error codes from A04/A05. Test boundary examples rather than reproducing schema implementation.
2. Add user/session schemas, required indexes, and the startup index gate. Establish the module/provider boundaries from Engineering; keep persistence and HTTP responsibilities separate.
3. Add the validation pipe, safe exception mapping, bounded JSON parsing, origin/header/content-type controls, security headers, throttling, and safe logs before exposing mutation endpoints.
4. Implement PasswordHasher and UsersService, consuming normalized values from shared schemas and handling public projection, internal credential lookup, and recognized duplicate-email conflicts. Do not reimplement normalization policy in persistence.
5. Implement signup through AuthService/AuthController. Verify valid creation, independent server validation, password storage, and concurrent duplicate signup.
6. Implement SessionsService issuance, authoritative lookup, expiry, and confirmed revocation using A10. Verify real replica-set behavior and failure/uncertain-acknowledgment handling.
7. Implement signin and cookie issuance after acknowledged session creation; test invalid/unknown credentials and absence of a new cookie on failure.
8. Register the default-required SessionGuard, explicit method-level public exceptions, and `/auth/me`. Test session-owner access and preservation of request security on public handlers.
9. Implement logout and cookie deletion after confirmed revocation. Verify replay rejection, repeated logout, failed confirmation, and the documented in-flight-request boundary.
10. Complete T02–T08's applicable API/schema evidence, including malformed inputs, CSRF failures, expiry before TTL cleanup, unknown API paths, and safe dependency errors. Add security and tests with each endpoint, not only after all endpoints exist.

Exit evidence: T02 and T04–T08 pass; T03's schema/API portions pass, with browser parity pending M3. Browser behavior is not a substitute for API authorization/validation evidence.

### M2 result — 2026-10-20

Shared contracts are revision `98ad6af` and the authentication API `e1dde67`, on local `main`. The tasks were completed in the documented order, test-first per slice: shared schemas; persistence and the index gate; the HTTP pipeline and throttling; signup; sessions, signin, the guard, `/auth/me`, and logout; failure semantics; production configuration. Contract gaps found before dependent code were recorded first (see the change log).

An independent review then found two defects, both fixed with regression tests before the commit:

- Nest's built-in schema pipe recursively deletes `__proto__`, `constructor`, and `prototype` keys before validating. The strict schemas therefore accepted those keys, and a deeply nested body under 16 KiB overflowed the stack and returned 500.
- The `/api` checks were case-sensitive, while Express routing is not. A differently cased API path skipped `no-store` and logging, and with `SERVE_WEB` it received the SPA shell.

The review's test gaps were also closed: server-selection and server-code outages, the token-shape gate before lookup, and the controls for non-POST methods. An unreachable `acknowledged: false` branch was removed; the authoritative absence check already covers it.

Actual verification, on Node 24.22.0/npm 12.2.0 from a temporary tool directory with the Compose replica set `easy-generator-rs` (Mongo 8.0.32):

- `npm run check:foundation` passed lint/format, strict typecheck, 205 tests (73 contracts, 128 API, 4 web), and the ordered builds.
- 19 deliberate production-code mutations were each caught by at least one failing test. The first run's only survivor (`<` versus `<=` at the expiry boundary) led to a frozen test clock and an exact-boundary test.
- A live `npm run dev` journey through the Vite proxy:
  - signup 201, duplicate signup 409, wrong password 401, cross-origin signin 403;
  - signin 200 with an HttpOnly, SameSite=Lax `session` cookie;
  - `/auth/me` 200, then logout 204 with the cookie expired;
  - the revoked token 401, and an unknown API route the JSON 404.

  The request logs were single JSON lines whose request IDs matched the responses, with no email, password, or connection string.
- The compiled `npm run preview` repeated the journey. Direct SPA routes served the built HTML with `no-cache`, under the local-mode CSP.
- The compiled `npm run start:prod`, with `APP_ORIGIN=https://app.example.test` over loopback HTTP:
  - issued `__Host-session` with Secure, HttpOnly, SameSite=Lax, and Path=/, and no Domain;
  - sent HSTS, and a CSP with `script-src 'self'` and `upgrade-insecure-requests`;
  - ignored the development cookie name and rejected a non-matching origin.

  This is not a deployed HTTPS check.
- The README curl example ran verbatim under zsh and bash.
- Argon2id at the documented parameters measured a median 13.1 ms per hash and per verification over 20 runs.
- Accounts created by these live checks in the local development database were removed by exact email afterwards. No `easy_generator_test_*` database remained.

Issues resolved along the way:

- argon2 0.45's PHC parameter order: the test now parses the parameters.
- The token final-character set was measured at 16 characters; the initial assumption was wrong.
- Health's thrown 503 would have become a 500 under the catch-all filter, so the controller now sets the status.
- Fault injection needed Mongoose queries to be awaited rather than `.exec()`'d.
- The two review defects above.

No M2 blocker remains. Linearizable session reads cost about 0.1 s per authenticated request on the local set, the latency trade-off A10 accepts. The in-flight boundary is asserted as "a check begun after confirmed revocation rejects the token". By design, logout does not cancel work authorized earlier. M3 is next. No browser journey, CI, publication, or submission is included in M2.

## M3 — Browser tasks

1. Implement the typed API client with the actual HTTP contract, relative URLs, required request headers, timeout/cancellation, and error decoding.
2. Establish the stable QueryClient and session query, then the auth coordinator and route shell/guards. Follow A11 for derived auth state, bootstrap/focus/reconnect/navigation checks, cancellation, cache transitions, offline failures, and credential-safe actions.
3. Build the common accessible layout and field/button/error patterns using the chosen minimal visual direction.
4. Implement signup and signin using React Hook Form, the shared Zod resolver, and awaited auth-provider actions; include pending, field-error, conflict, rate-limit, and service-error states. Keep credentials out of shared caches. Do not bypass the provider for signin or logout.
5. Implement the exact welcome message and current-session logout. Verify failed logout and uncertain session checks do not misreport authentication state.
6. Complete retry, expiry, background form-preservation, offline, and stale-response cases; add the rendering error boundary, real browser journey, and initial accessibility review. Verify query state is not duplicated and credential submissions are not retained in mutation state.

Exit evidence: T03's remaining browser-parity portion, T09, and T10 pass; perform an initial T11 review. No extra product pages are introduced.

### M3 result — 2026-10-21

Implementation revision: `0fa1348` (`feat(web): implement and verify M3 browser authentication journey`).

Implemented the browser work in the documented dependency order: typed HTTP transport, session query/coordinator and routes, shared layout/fields, signup/signin, welcome/logout, then recovery/race cases, rendering boundary, Playwright and the initial accessibility review. No material contract contradiction required an API/schema change.

- Typed errors separate validation, credential failure, unauthenticated, conflict, throttling, request rejection, and unavailability. Requests use a 15-second abort budget, same-origin cookies, shared response decoding, and the required JSON/CSRF headers.
- Query caches only public users/null. Auth status also checks verification/error/navigation state. Credential actions are awaited directly; logout is a credential-free mutation. Cancellation and immediate action guards suspend checks, including manual Retry, during mutations. Failed verification withholds protected content while preserving public forms.
- Shared resolvers preserve password characters, normalize email/name, and display field/server errors. Recovery includes expiry, failed logout, offline failure without replay, rate-limit deadlines, and the rendering boundary. Navigation uses fixed destinations.
- The browser fixture serves the real compiled UI/API from a fresh server and owned database per test. All real rate limits stay enabled. Expiry advances the injected server clock while the session record remains stored, independently of MongoDB TTL.
- `npm run check` passed 239 workspace tests and 10 browser tests plus lint/format, strict typecheck, and builds. A final fixture strengthening was followed by typecheck/lint and the browser/build suite. Six deliberate production mutations were caught and restored. Detailed commands and limitations are in Verification.

Corrections from executable tests and the single-agent contract review:

1. RHF schedules a second first-error focus using a timer. A real Chromium probe showed it stealing focus during rapid correction, routing the intended password fill to Name. Disable the duplicate default and focus the first invalid field once in the invalid-submit callback; retain normal RHF registration and field state.
2. Do not derive mutation-time authentication from the presence of cached data. After a failed verification that could temporarily expose an unverified cached user. Preserve the prior derived UI status during the action; a regression and deliberate mutation prove the boundary.
3. Manual session Retry must also respect the action lock; an unavailable notice can remain mounted during signin.
4. Reconnect may automatically settle the session before a test clicks Retry. The browser test now asserts that recovery and the absence of POST replay instead of requiring a vanished button.

T03, T09, and T10 close at M3. Initial T11 observations are recorded, with its unperformed manual criteria still Pending. M4 was not started; CI/publication/recruiter actions were not performed.

## M4 — Quality and CI tasks

1. Run the combined meaningful test suite; keep test databases isolated and test data independent. Resolve failures before adding extras.
2. Review keyboard navigation, screen sizes, zoom, errors, focus, loading, and autofill. Record concrete observations and fixes.
3. Verify auth cookie/header behavior under production configuration, static asset/API routing, and the compiled application. Document the distinction between a local preview and deployed HTTPS validation.
4. Add GitHub Actions checks using the pinned Node/npm versions, a pinned single-node MongoDB replica-set service with initialization/readiness, `npm ci`, lint, typecheck, tests, browser checks, and production build. Use least-needed repository permissions and no deployment credentials.
5. Review dependencies and application code for concrete security or maintenance issues, inspect logs/serialized responses, and resolve relevant findings. Do not treat an unexamined audit count as a security certification.

Exit evidence: T01–T11 pass locally; T12's runtime/build portions and T16's code/security review portion pass. Their final clean-checkout/documentation and tracked-artifact review portions close at M5. T13's workflow review and local-equivalent checks are complete; its remote run is explicitly deferred to M6 if no remote repository exists. Pending external CI does not block local M5 preparation, but CI cannot be claimed green before the actual run passes.

## M5 — Documentation and release preparation

README must cover prerequisites and pinned versions; local setup; environment variables; MongoDB startup; development; production build/local preview; checks and test isolation; project structure; API requests/responses and required origin/header/cookies; session/security choices; and known scope limits. Include an example using a cookie jar for signin → me → logout, using dummy credentials and the real planned origin/header requirements.

1. Follow the README from a clean checkout/temp directory against isolated data. Commands must work without undocumented global packages or private credentials.
2. Update API examples and the AI.md implementation record to match the final code. Record useful prompts, actual corrections, and evidence; remove the pending implementation placeholder only when truthful entries replace it.
3. Reconcile requirement IDs with verification evidence; inspect the final diff and tracked files for unwanted artifacts or credentials. Exclude local source brief copies from the public code deliverable.
4. Ensure the lockfile, example env, scripts, Compose file, workflow, README, AI.md, and planning baseline are consistent. Prepare a concise repository description and recruiter handoff text locally.
5. Record any remaining limitation accurately. An unresolved required behavior keeps the project below “submission ready.”

Exit evidence: T12, T14, T16 and all functional checks pass. A workflow definition can be ready locally, but a remote CI result remains a separate pending requirement of the selected CI scope until observed.

## M6 — Submission

Use the user's authorization at the time of submission to create/push the public repository and, if explicitly instructed, send the recruiter message. Repository owner/name and recruiter contact are not needed to finish planning or local implementation. They are deferred handoff inputs; do not invent them.

Verify the public repository, submitted commit, README, AI.md, and CI result. Provide the repository URL and prepared handoff text if sending is not authorized or the recruiter address is unavailable. Record that state as **ready for handoff**, not **submitted**. T15 passes only when the required link handoff is confirmed.

## Command contract to implement

These are milestone-spanning command interfaces. M1 implements install, database setup, development, lint/typecheck/tests, builds, preview, and production startup. `check` and `test:e2e` are implemented at M3; `check:foundation` runs lint/typecheck/workspace tests/build without browsers. README lists actual available commands.

| Command | Expected behavior |
| --- | --- |
| `npm ci` | Install the locked workspace dependencies |
| `docker compose up -d` | Start the local MongoDB server with replica-set configuration |
| `npm run db:ready` | Initialize the known local/test replica set idempotently if needed and wait for a writable primary; never reconfigure a managed database |
| `npm run dev` | Build contracts initially, then watch contracts/API/web with correct startup order |
| `npm run lint` | Check code without modifying files |
| `npm run typecheck` | Check all TypeScript workspaces |
| `npm run test` | Run schema/unit and API integration checks using isolated MongoDB |
| `npm run test:e2e` | Run focused Playwright browser tests with controlled server lifecycle |
| `npm run build` | Build contracts, API, and web in dependency order |
| `npm run preview` | Serve built web/API locally with explicitly documented development cookie settings |
| `npm run start:prod` | Run the built server with validated production configuration and web assets |
| `npm run check` | Run lint, typecheck, application tests, browser tests, and build; prerequisites documented |

## Time and risk budget

Planning estimate revised with the explicit database setup: M1 45–75 minutes; M2 75–120; M3 60–90; M4 45–75; M5 25–40. Roughly **4–7 hours**, with tooling/debugging and submission availability potentially extending it. This is an estimate, not an achieved duration or a deadline promised by the brief. Record actual time if measured.

| Risk | Response |
| --- | --- |
| Version, module-system, or test-compiler mismatch | Resolve the M1 build/test smoke before writing feature code |
| Docker/Mongo unavailable | Check early; use a configured dedicated MongoDB if available; do not substitute a different database silently |
| Cookie/proxy/Origin mismatch | Keep one browser origin; cover configured Origin and production cookie attributes in integration tests |
| Duplicate account or delayed expiry cleanup | Unique index, concurrent test, server-side expiry predicate |
| Small assignment grows into an auth platform | Enforce non-goals and record changes before adding features |
| Test fixtures contaminate real data | Separate URI and generated test databases; cleanup only databases owned by that test run |
| Native Argon2/tooling installation issue | Resolve early with a maintained compatible build/package; do not silently weaken password hashing |
| Time estimate exceeded | Finish required behavior/security first; reduce cosmetic work or explicitly revise selected optional scope, then document the reason |
| Remote CI or recruiter unavailable | Complete local preparation; report the remaining external step accurately |

## Change log

| Date | Change | Reason / affected scope | Status |
| --- | --- | --- | --- |
| 2026-10-19 | Baseline v1 created; React/TypeScript and minimal professional UI confirmed | Initial planning request; R01 and UX direction | Prepared; implementation not started |
| 2026-10-19 | Pre-implementation review refined session-response races, public form preservation, and milestone evidence boundaries | A05; UX session model; T03, T06, T10, T12, T13, T16 | Incorporated into v1 |
| 2026-10-19 | Added root AGENTS.md with project context, document ownership, and agent working agreements | User's request for durable project guidance; product scope and contracts unchanged | Documentation only |
| 2026-10-20 | Baseline v1.1: concrete OOP/SOLID boundaries, ordered implementation steps, explicit session/JWT/RBAC decisions, and database consistency policy | User requested complete engineering decisions; A09/A10, E01–E06, R07/R11, T04/T06–T08/T12/T13/T16; one-node replica-set setup selected for local/CI | Planning only; implementation not started |
| 2026-10-20 | Baseline v1.2: adopt React Hook Form with Zod resolver and TanStack Query over fetch; define form/server/local-state ownership, credential-safe actions, and auth cache/retry rules | User proposed frontend packages and requested React best practices; A01/A11, E05, M3, T01/T03/T10/T16, R01/R06/R11; replaces manual form/session request bookkeeping without product scope changes | Planning only; no packages installed |
| 2026-10-20 | Start authorized M1 against v1.2; resolve exact runtime/tool versions before scaffolding | Workspace confirmed planning-only, no Git; host Node 24.13.0/npm 11.6.2 below current generator floor. Select Node 24.22.0/npm 12.2.0 in runtime pins. Select TypeScript 6.0.3 because current typescript-eslint supports `<6.1`, excluding current TypeScript 7. No behavior/scope change; T01/T12 | Implementation in progress; Docker Desktop started; temporary tools leave global runtime unchanged |
| 2026-10-20 | Resolve local MongoDB port to 27018 and pin Mongo 8.0.32 by digest | Port 27017 was occupied; preserve existing service. Use the same advertised container/host port for discovery. No standalone fallback, replica-set reconfiguration, or concern weakening; A08/A10, T12 | Local setup verified |
| 2026-10-20 | Close M1 foundation only | T01 passed and T12 setup evidence recorded; authentication contracts/behavior, final release checks, remote CI and submission remain Pending | Verified locally; next milestone M2 |
| 2026-10-20 | Record the M1 → M2 handoff and bind evidence to `7a16842` | User requested updated progress/evidence and a concise continuation point; no scope or runtime changes | Documentation only; M2 remains Planned |
| 2026-10-20 | Added root CLAUDE.md for Claude Code: imports AGENTS.md, then records verified commands, single-test invocations, and code-level conventions | User's Claude Code /init request. By default Claude Code loads AGENTS.md only when a project has no CLAUDE.md, so the import keeps one shared guide. Product scope, contracts, and checks unchanged | Documentation only |
| 2026-10-20 | Start authorized M2; clarify contract gaps before dependent code: reject unpaired UTF-16 surrogates in string inputs; ordered/aborting field checks; generic validation message without `fields` for non-field issues; `404 NOT_FOUND` for unknown API routes; request controls scoped to non-GET/HEAD/OPTIONS `/api` requests and run before parsing; compressed bodies `415`; Helmet defaults in production with HSTS/`upgrade-insecure-requests` disabled only for local HTTP modes | Found while mapping A04/A05/A07 onto the pinned Zod, Nest, and Express behavior. Lone surrogates would otherwise be silently replaced during UTF-8 hashing/storage (exact preservation, T03); Nest's default 404 echoes the request path (T08); Helmet's HTTPS-only directives would break the documented loopback preview (T07/T12). No product scope, route, credential, cookie, or concern-policy change | Clarified in Architecture A04/A05/A07 before implementation |
| 2026-10-20 | Close M2 authentication API; adopt Helmet 8.3.0, cookie-parser 1.4.7, and `@nestjs/throttler` 6.7.1 | T02 and T04–T08 passed; T03 schema/API portions passed with browser parity Pending; M2 portions of T12/T16 recorded. Independent review fixes restored A04/A05/A02 compliance without contract changes: strict rejection of prototype-shaped keys and no recursive pre-validation stripping (deep-nesting 500), and case-insensitive `/api` handling consistent with Express routing. Implementation `e1dde67`; contracts `98ad6af` | Verified locally; next milestone M3 |

| 2026-10-21 | Start authorized M3 browser implementation; pin Playwright 1.64.1 / Chromium 1248 in ignored `.cache/ms-playwright` | A11/E05/T03/T09–T11; fresh compiled API and owned test database per browser case preserve real rate limits without changing production configuration. Node 24.22.0/npm 12.2.0 installed through nvm as requested; no API/schema contract change | Implemented and verified locally; see M3 result |

| 2026-10-21 | Close M3 browser journey; expose `test:e2e` and the combined `check` command | T03/T09/T10 pass, initial T11 review recorded. Typed transport, credential-safe query coordination, forms and routes, recovery, and compiled browser journeys; API/schema/security contracts unchanged. Full T11 and quality/CI/release gates remain M4–M6 | Verified locally; stop after M3 |

Future entries should include the decision changed, rationale, affected requirement/check IDs, and validation impact. Do not overwrite history to conceal a scope reduction.
