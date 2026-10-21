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
| M4 — Quality gate | M2, M3 | Meaningful integration/browser checks, responsive/accessibility review, safe logs, production build review, and CI are complete | Verified locally: T01–T11 pass; T12 runtime/build and T16 code/security portions pass; T13 workflow review, local replays, and first remote runs done (green on `719be13`); the submitted revision's run is M6 |
| M5 — Submission ready | M4 | Fresh-checkout README walkthrough, accurate AI record, evidence review, and publication-ready tracked files | Verified locally: T01–T12, T14, T16 pass; every requirement except R09 and B03 has passing evidence; private CI run #5 passed; T13's submitted-revision run and T15 are M6 |
| M6 — Submission | M5; authorized submission action and destination details | Public GitHub revision verified and recruiter link handoff actually performed | Planned |

The dependency path is M1 → M2 → M3 integration → M4 → M5 → M6. After M1, the UI shell and backend work can run in parallel against the frozen contracts; shared-contract edits must be coordinated. Do not parallelize competing edits to the same contract or use a UI mock as proof that the backend works.

## Current handoff — 2026-10-21 (after M5)

- **Completed:** M0–M5. M5 is revisions `76fd472`, `c25c6da`, `32cd707`, `3a178a0`, and `88cc7c1` plus its evidence commit, all pushed to the private `origin/main`. T01–T12, T14, and T16 pass. Every requirement except R09 (public repository and handoff) and B03 (CI on the submitted revision) has passing evidence (Verification, M5 requirement reconciliation). `npm run check` on the final tree passed lint/format, strict typecheck, **255 workspace tests (73 contracts, 142 API, 40 web)**, builds, and **10 Chromium tests**. Private CI run #5 (`32cd707`) passed every step; the run on the M5 evidence commit is reported in the M5 handoff message, not here.
- **Unfinished:** M6. The repository is still private. T13 stays Pending until the submitted public revision has a passing run, and T15 until the recruiter link handoff is confirmed. No deployment exists, and nothing was sent.
- **Decisions to retain:** baseline v1.2, M2's contract clarifications, and M4's configuration clarifications. Production requires `TRUST_PROXY` covering `127.0.0.1` (the API listens on loopback only). Development, test, and preview accept only loopback origins. `MONGODB_URI` carries no policy options. The browser bundle runs Zod jitless under an unchanged CSP. Retained from M3: React/RHF/shared Zod/TanStack/native fetch; opaque HttpOnly sessions; read-only session checks; exact origins (`http://localhost:5173` dev, `http://localhost:3000` compiled test/preview); production rate limits 5/10/30/120. From M5: the SPA shell is sent relative to the web directory, so the install path never decides what is hidden.
- **Runtime and test setup:** Node 24.22.0/npm 12.2.0 in nvm (`source ~/.nvm/nvm.sh && nvm use`). Docker's project replica set is on 27018, and 27017 was untouched; recheck `npm run db:ready` before resuming. Every checkout shares that Compose project (see CLAUDE.md). Playwright 1.64.1 / Chromium 1248 is in ignored `.cache/ms-playwright`; browser cases own port 3000 and create/drop only their own generated databases. CI is `.github/workflows/ci.yml`.
- **Blockers:** none for M6's local side. Making the repository public, and sending the recruiter message, need the user's explicit authorization and the recruiter's contact.
- **Next concrete task:** M6. With the user's authorization, make `HossamElAnsary/easygenerator-auth` public, set the prepared description, confirm the submitted revision's CI run passes (T13), and verify the public README, AI.md, and commit from a logged-out view. Send the prepared handoff text only when instructed (T15), then record **submitted** or **ready for handoff** accordingly.

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

### M4 result — 2026-10-21

Revisions on local `main`: `9e8f9c4` (CSP-safe Zod in the browser), `694b6f2` (deployment configuration and static-asset errors), `8b3b76d` (GitHub Actions workflow), `6f665b9` (API test timeouts for shared CI CPUs), followed by this evidence commit. The tasks ran in the documented order.

1. **Combined suite.** `npm run check` passed on the clean `bdc2283` handoff before any edit (239 workspace and 10 browser tests). No failure needed resolving.
2. **Accessibility and responsive review.** Exercised what M3 left open with the browser's own mechanisms. Native page zoom at 200% and 400% leaves no overflow or clipped control in eight screen states. At 200% the keyboard path stays in view with a visible focus ring. Chromium's password manager offers to save after signup and signin and fills a stored credential that signs in. axe-core finds no WCAG A/AA violation. T11 passes for Chromium. A best-practice note (no `h1` on the session-unavailable screen) is accepted because Experience fixes that copy.
3. **Production configuration review.** The compiled server ran in production mode behind a local TLS-terminating proxy, driven by Chromium with a pinned throwaway certificate. Cookies, headers, routing, assets, shutdown, and logs behave as specified. The run exposed a CSP violation on every page load, caused by Zod's caught `new Function` probe and present in every mode. The browser bundle now runs Zod jitless, and every browser case fails on a reported violation. Topology limits are now written down: loopback-only listener, same-host proxy, proxy trust, asset caching.
4. **CI.** `.github/workflows/ci.yml` mirrors the local gate on the pinned runtime and replica set, with read-only permissions, no secrets, and SHA-pinned actions. actionlint reports no errors. Replaying its run steps in clean Linux containers showed that ordinary API cases could exceed Vitest's 5 s default when test workers and MongoDB shared CPUs, as on a CI runner. `6f665b9` raised the API test timeouts without changing any assertion or product budget. The native arm64 replay of that commit passed every step, browser journey included; emulated amd64 passed the same commit's x64 build and all 10 browser cases in x64 Chromium, with the API suite on one worker (an emulation accommodation). The first remote runs came after M4 (see below).
5. **Security and maintainability review.** An independent read-only reviewer found four defects, all reproduced and fixed test-first: production accepted no proxy trust behind its loopback-only listener (one global rate-limit bucket); development/test accepted a public HTTPS origin with non-`Secure` cookies; MongoDB URI aliases bypassed the fixed policy; failed requests for existing assets became 404. `npm audit` reported no advisory, signatures verified, and logs and responses were re-inspected. Eight deliberate production mutations were caught.

Corrections made along the way:

- Playwright's screenshots are wrong under browser zoom; captures go through CDP.
- Nest exits by re-raising SIGTERM after its hooks, not with code 0.
- The first URI-check order let the driver print a deprecation warning for a rejected alias; the check now runs before the driver parses the URI.
- Emulated amd64 test workers missed vitest's start timeout; a serial amd64 run and a native Linux run showed this was emulation, not a defect.
- A zero-context partial staging placed one CLAUDE.md line in the wrong section; the two unpublished fix commits were rebuilt before anything depended on them.

T11 passes. T12, T13, and T16 keep their M5/M6 portions Pending. M5 was not started, and nothing was deployed or sent.

**After M4 — first remote CI (2026-10-21).** The user created the private repository `HossamElAnsary/easygenerator-auth`. After a pre-push audit (13 commits, no credential-shaped content, no env files, brief copies, build output, or local paths in any commit), the user approved pushing `main`. Run #1 (`9cbb4d1`) passed setup, `db:ready`, lint, typecheck, and the API suite, then failed one web test. That exposed a real defect: a Retry-After wait could stay blocked if its timer fired a millisecond before `Date.now()` reached the deadline. `4bf2f2c` fixed it test-first. Run #2 failed `db:ready` on a cold container, where each `mongosh` probe was killed after 3 s. `f136be0` allows 15 s per probe and starts no probe after 60 s, and `719be13` prints the container's state and logs when a step fails. Run #3 (`719be13`) passed every step in 2 min 40 s.

## M5 — Documentation and release preparation

README must cover prerequisites and pinned versions; local setup; environment variables; MongoDB startup; development; production build/local preview; checks and test isolation; project structure; API requests/responses and required origin/header/cookies; session/security choices; and known scope limits. Include an example using a cookie jar for signin → me → logout, using dummy credentials and the real planned origin/header requirements.

1. Follow the README from a clean checkout/temp directory against isolated data. Commands must work without undocumented global packages or private credentials.
2. Update API examples and the AI.md implementation record to match the final code. Record useful prompts, actual corrections, and evidence; remove the pending implementation placeholder only when truthful entries replace it.
3. Reconcile requirement IDs with verification evidence; inspect the final diff and tracked files for unwanted artifacts or credentials. Exclude local source brief copies from the public code deliverable.
4. Ensure the lockfile, example env, scripts, Compose file, workflow, README, AI.md, and planning baseline are consistent. Prepare a concise repository description and recruiter handoff text locally.
5. Record any remaining limitation accurately. An unresolved required behavior keeps the project below “submission ready.”

Exit evidence: T12, T14, T16 and all functional checks pass. A workflow definition can be ready locally, but a remote CI result remains a separate pending requirement of the selected CI scope until observed.

### M5 result — 2026-10-21

Revisions on `main`, pushed to the private `origin`: `76fd472` (SPA shell from any install path), `c25c6da` (walkthrough fixes), `32cd707` (ignore the browser tool's output), `3a178a0` and `88cc7c1` (independent-review fixes), then this evidence commit. Another Claude Code session shared the checkout, so M5 ran in an isolated Git worktree branched from `5dfebb3`. The tasks ran in the documented order; exact commands and results are in Verification's M5 evidence.

1. **Clean-checkout walkthrough.** `origin` (`5dfebb3`) was cloned into a temporary directory and README was followed as written: prerequisites, install, environment, a fresh MongoDB volume under a separate Compose project, the dev server driven in Chromium at `http://localhost:5173`, the curl example under zsh and bash, Chromium installation, `npm run check`, the build, the preview (including a session that survived a server restart), and the production start checks. The original container was stopped first and restored afterwards, with its data unchanged. After the fixes were pushed, the clone was pulled to `32cd707` and the changed steps plus `npm run check` were repeated.
2. **Defects and misleading steps found, all fixed:**
   - The baseline gate in the worktree failed all 10 browser cases with a blank page. `res.sendFile()` got the shell's absolute path, and send 1.2.1 treats a dot-directory anywhere in an absolute path (here `.claude/worktrees`) as a hidden file, so every browser route returned an empty 500. Latent since M2 (`e1dde67`); no earlier checkout or CI path had a dot segment. A copy of the published `5dfebb3` under a dot-named directory reproduced it, and the same copy of `32cd707` serves the shell. Fixed test-first in `76fd472`.
   - Node 24.22.0 bundles npm 11.19.1, so README's npm upgrade is always needed for this pin; `npm ci` with the bundled npm fails with `EBADENGINE`. README said "if needed".
   - Vite's banner prints `http://127.0.0.1:5173/`. Following it loads the pages, but every submission fails with `This request is not allowed.` README now explains that.
   - The curl example ended with an inline `#` comment. zsh's manual says interactive zsh treats `#` as a word unless `INTERACTIVE_COMMENTS` is set (default only under sh/ksh emulation), so pasting the block into a stock interactive zsh would pass `#`, `401:`, `the`, … to curl. The comment moved into the prose, and each response body now ends with a newline.
   - A busy port 3000 (dev and preview share it) produced a startup line that named only configuration, database, and assets. It now also names `PORT`, still as one fixed line.
   - README said "this workstation" twice and claimed only macOS verification; CI also verifies Linux x64.
3. **Requirement reconciliation.** R01–R08, R10, R11, B01, B02, and B04–B06 have passing evidence. R09 (T15) and B03 (T13's submitted-revision run) are M6. See Verification.
4. **Tracked files and history.** All 17 commits, 125 historical paths, and 188 unique blobs were scanned: no credential, key, token, connection credential, env file, brief copy, build output, test result, or local path was ever committed (the 29 pattern hits were the GitHub owner name in repository URLs, `./users/` imports, and synthetic test passwords). Ignore rules cover the brief copies, env files, dependencies, caches, build output, and test results; `.playwright-mcp/`, where the Playwright MCP browser tool writes snapshots, was added in `32cd707` after it appeared untracked and failed the Prettier check. Commit authorship keeps the email the user chose before the first push.
5. **Consistency.** README's 17 version pins match the manifests, and every dependency is exact; `npm ci` from the lockfile succeeded on a fresh runtime. The code reads exactly the seven settings in `.env.example` and README. Scripts match README, CLAUDE.md, and the command contract above; the Compose digest, workflow steps, and README/CLAUDE.md descriptions agree. One stale statement was corrected: `db:ready` stops starting probes after 60 s, so probing can last about 75 s (the M4 note and change log said "60 s overall"). CLAUDE.md now records that every checkout shares the fixed Compose project.
6. **Final review (T16).** An independent read-only reviewer checked the code changed after M4's review (`694b6f2`..`32cd707`) against A02/A05/A07 and the installed express, send, and serve-static sources. It found no security regression in the static-serving change: dotfile, encoded-traversal, and asset paths still never reach a file outside the web directory. It found two Low defects, both fixed: a `Retry-After` above about 24.8 days made the re-arming wait from `4bf2f2c` wake every few milliseconds (`3a178a0`, test-first, re-arm mutation caught); and the shell's error callback left a response open if a read failed after its headers (`88cc7c1`, mirroring the asset branch, no test). `npm audit` reported 0 advisories; 417 signatures and 122 attestations verified.

**Prepared repository description** (not applied; the current one is "A full-stack authentication application built with React, TypeScript, NestJS, and MongoDB."):

> Full-stack authentication task: React/TypeScript UI, NestJS API, MongoDB-backed HttpOnly sessions, shared Zod validation, Playwright tests, and GitHub Actions CI.

**Prepared recruiter handoff** (not sent; send only when instructed, after the repository is public):

> Subject: Full Stack Test Task submission
>
> Hi [recruiter name],
>
> Here is my submission for the Full Stack Test Task: https://github.com/HossamElAnsary/easygenerator-auth
>
> It implements signup (email, name, and password, validated on both the frontend and the backend), signin, and an authenticated page that shows "Welcome to the application.", using React with TypeScript, NestJS, and MongoDB. `GET /api/auth/me` is the protected endpoint; sessions are opaque, stored server-side, and carried in an HttpOnly cookie. Logout, API integration and real-browser tests, GitHub Actions CI, safe request logs, and Markdown API documentation are included.
>
> The README explains setup with Docker and the pinned Node/npm versions. AI.md records where AI assisted, which approaches worked, and where its output was corrected.
>
> Thank you for your time. I am happy to walk through any part of it.
>
> Best regards,
> Hossam

**Remaining limitations** (none is an unresolved required behavior):

- The repository is private. Publication, the submitted revision's CI run (T13), and the recruiter handoff (T15) are M6.
- No deployed HTTPS environment, multi-node replica set, failover, backup, or load test exists. Production mode was exercised over loopback and behind a local TLS proxy (M4) only.
- Browser evidence is Chromium only; no screen reader, other browser, or third-party password manager was tested.
- Rate-limit counters are in memory and per process. Signup deliberately reveals that an email is registered (A05).
- The walkthrough ran on macOS arm64; Linux x64 is covered by CI only. The session's command isolation refused sourcing `nvm.sh`, so the official Node 24.22.0 tarball (checksum verified) stood in for `nvm install`; every later step followed README. Interactive-zsh comment handling comes from zsh's manual, because the same isolation refused an interactive shell.
- Accepted observations, not defects: a favicon 404 and the anonymous session check's 401 appear in the browser console; axe's best-practice `page-has-heading-one` on the session-unavailable screen; `npm ls` flags ESLint's `ajv` against `@hookform/resolvers`' unused optional peer.

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
| 2026-10-21 | Start authorized M4 quality and CI from the clean M3 handoff (`bdc2283`) | T01–T13, T16; baseline gate rerun before any edit; no scope change | Implementation in progress |
| 2026-10-21 | Run Zod jitless in the browser bundle; every browser case fails on a reported CSP violation | A07/T07/T12. The production-mode HTTPS review showed Zod's caught `new Function` probe reported as a `script-src` violation on every page load, in every mode. The CSP is unchanged (no `'unsafe-eval'`); the API keeps Zod's default. Revision `9e8f9c4` | Implemented with a failing-first browser check |
| 2026-10-21 | Clarify the deployment configuration contract after the independent M4 review: production requires `TRUST_PROXY` covering `127.0.0.1`; outside production `APP_ORIGIN` must be loopback; `MONGODB_URI` also rejects `wtimeout`, `retryReads`, `connectTimeoutMS`, `waitQueueTimeoutMS`, `readPreferenceTags`, `maxStalenessSeconds`; a failed request for an existing asset keeps its status | A02/A07/A08, T07/T12/T16. The API always listened on loopback only, so production without proxy trust put every client in one rate-limit bucket; non-production modes served a public HTTPS origin with non-`Secure` cookies; the driver let `wtimeout` override the fixed write-concern budget; 416/412/read errors became 404. Fail-closed validation only; no route, response, cookie, schema, or rate-limit value changed. Deployments must now set `TRUST_PROXY=127.0.0.1`. Revision `694b6f2` | Implemented test-first; Architecture, README, CLAUDE.md updated |
| 2026-10-21 | Add the GitHub Actions quality gate (`.github/workflows/ci.yml`) | B03/T13. Pinned Node/npm, Compose MongoDB replica set with `db:ready`, locked install, lint, typecheck, workspace tests, browser journey, production build; read-only permissions, no secrets or deployment; actions pinned by SHA. Revision `8b3b76d` | Workflow reviewed and replayed locally; no remote run (no remote exists) |
| 2026-10-21 | Close M4 quality and CI | T01–T11 pass; T12's runtime/build and T16's code/security portions pass; T13's workflow review and local Linux replays are recorded, with the remote run deferred to M6 because no remote exists. Revisions `9e8f9c4`, `694b6f2`, `8b3b76d`, `6f665b9` (API test timeouts tolerant of shared CI CPUs; no assertion or product budget changed), plus the evidence commit | Verified locally; stop after M4 |
| 2026-10-21 | Push `main` to the user-created private repository `HossamElAnsary/easygenerator-auth` and run CI remotely before M5 | User created the repository and approved the push after a pre-push audit; commit author email kept. T13 remote evidence; R09/T15 (public repository, recruiter handoff) remain M6 | Pushed; runs #1–#3 recorded in Verification |
| 2026-10-21 | Fix two defects found by the first remote runs: a Retry-After wait that could stay blocked after an early timer; `db:ready` giving up on a cold CI container | T10/B06 (rate-limit recovery), T13. No API, contract, or UI copy change; a deterministic regression test for the wait; `db:ready` probe budget 3 s → 15 s per probe, and no new probe after 30 s → 60 s (so probing can last about 75 s); failure-only CI diagnostics. Revisions `4bf2f2c`, `f136be0`, `719be13` | Fixed; run #3 passed every step |
| 2026-10-21 | Start authorized M5 from the clean `5dfebb3` handoff, in an isolated Git worktree because another session shared the checkout | T12, T14, T16; the baseline gate was rerun before any edit and failed all 10 browser cases from the worktree path. No scope change | Implementation in progress |
| 2026-10-21 | Fix what the clean-checkout walkthrough and the independent review found: the SPA shell from an install path with a dot-directory (`76fd472`); README traps (npm upgrade, Vite's 127.0.0.1 banner, an inline comment interactive zsh passes to curl) and a startup line that now names `PORT` (`c25c6da`); the browser tool's output ignored (`32cd707`); a `Retry-After` beyond the largest timer delay spinning the wait (`3a178a0`); a shell response left open after a late read error (`88cc7c1`) | A02 (direct SPA routes), A07 (one generic startup line, still no values), T10, T12, T14, T16. No route, response, cookie, schema, rate-limit, or UI copy change. The `db:ready` timing note above was corrected | Fixed; private CI run #5 passed on `32cd707` |
| 2026-10-21 | Replace MongoDB 8.0.32 with 7.0.45 (pinned by digest), under a new Compose volume name | CI run #6 failed `db:ready` because GitHub's new `ubuntu-24.04` image (20261018.339) runs kernel 7.0.0-1017-azure, and MongoDB 8.0 refuses to start on kernels 6.19 through 7.0.13 (SERVER-121912: its bundled TCMalloc breaks the kernel's rseq ABI). No 8.0.x release fixes it, there is no supported override, and Ubuntu's `7.0.0` kernel string stays blocked even where 8.0.30+ exempts 7.0.14 (SERVER-136848). MongoDB 7.0 predates that allocator and is supported until 2027-08-31. Rejected: keeping 8.0 on `ubuntu-22.04` runners (kernel 6.8), which fixes CI but not a reviewer on a current Linux kernel; MongoDB 8.2, a rapid release whose fix is unconfirmed. Volume `mongodb-data` becomes `mongodb-data-7.0`, because 7.0 cannot open files written by 8.0; nothing is deleted. A01/A08/A10 policy unchanged (majority/journal writes, linearizable session reads); B03/T12/T13 re-verified | Recorded before the change |
| 2026-10-21 | Close M5 submission readiness | T01–T12, T14, T16 pass; T13 Pending only for the submitted public revision's run, T15 for the handoff. Repository description and recruiter text prepared, not applied or sent | Verified locally; stop after M5 |

Future entries should include the decision changed, rationale, affected requirement/check IDs, and validation impact. Do not overwrite history to conceal a scope reduction.
