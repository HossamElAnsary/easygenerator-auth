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
| M2 — Authentication API | M1 | User/session persistence, hashing, signup/signin/me/logout, request controls, and direct API tests pass | Planned |
| M3 — Browser journey | M2 contract; UI shell may start after M1 | Three pages, session states, errors, and complete browser journey work | Planned |
| M4 — Quality gate | M2, M3 | Meaningful integration/browser checks, responsive/accessibility review, safe logs, production build review, and CI are complete | Planned |
| M5 — Submission ready | M4 | Fresh-checkout README walkthrough, accurate AI record, evidence review, and publication-ready tracked files | Planned |
| M6 — Submission | M5; authorized submission action and destination details | Public GitHub revision verified and recruiter link handoff actually performed | Planned |

The dependency path is M1 → M2 → M3 integration → M4 → M5 → M6. After M1, the UI shell and backend work can run in parallel against the frozen contracts; shared-contract edits must be coordinated. Do not parallelize competing edits to the same contract or use a UI mock as proof that the backend works.

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

## M3 — Browser tasks

1. Implement the typed API client with the actual HTTP contract, relative URLs, required request headers, timeout/cancellation, and error decoding.
2. Establish the stable QueryClient and session query, then the auth coordinator and route shell/guards. Follow A11 for derived auth state, bootstrap/focus/reconnect/navigation checks, cancellation, cache transitions, offline failures, and credential-safe actions.
3. Build the common accessible layout and field/button/error patterns using the chosen minimal visual direction.
4. Implement signup and signin using React Hook Form, the shared Zod resolver, and awaited auth-provider actions; include pending, field-error, conflict, rate-limit, and service-error states. Keep credentials out of shared caches. Do not bypass the provider for signin or logout.
5. Implement the exact welcome message and current-session logout. Verify failed logout and uncertain session checks do not misreport authentication state.
6. Complete retry, expiry, background form-preservation, offline, and stale-response cases; add the rendering error boundary, real browser journey, and initial accessibility review. Verify query state is not duplicated and credential submissions are not retained in mutation state.

Exit evidence: T03's remaining browser-parity portion, T09, and T10 pass; perform an initial T11 review. No extra product pages are introduced.

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

These are milestone-spanning command interfaces. M1 implements install, database setup, development, lint/typecheck/tests, builds, preview, and production startup. Full `check` and `test:e2e` remain Pending until M3/M4; `check:foundation` runs the currently applicable M1 checks. README lists actual available commands.

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

Future entries should include the decision changed, rationale, affected requirement/check IDs, and validation impact. Do not overwrite history to conceal a scope reduction.
