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
| M5 — Submission ready | M4 | Fresh-checkout README walkthrough, accurate AI record, evidence review, and publication-ready tracked files | Verified locally: T01–T12, T14, T16 pass; every requirement except R09 and B03 has passing evidence. Private CI run #6 exposed MongoDB 8.0's refusal of the runners' new kernel, fixed by moving to 7.0.45; later runs pass. T13's submitted-revision run and T15 are M6 |
| M6 — Submission | M5; authorized submission action and destination details | Public GitHub revision verified and recruiter link handoff actually performed | In progress: publication done. The repository is public and verified logged out, and T13 passed for `6b68db7` (run #10) and `f7776e8` (run #11). M7 is verified, so the recruiter handoff (T15) now waits only for the user's instruction and the recipient |
| M7 — Docker-only run and README | M6 publication; baseline v1.3 | B07: Dockerfiles for the MongoDB, application, and proxy images and one Compose file that runs the whole application without host Node (A12). R08/B05: a short README in newcomer order, with the API contract in `docs/api.md` and development details in `docs/development.md`. Exit: T17 passes; T13, T14, and T16 pass again on M7's head; T01–T12 still pass | Verified: T17 passes; T13 (run #13, both jobs), T14, and T16 pass on `f74212e`; T01–T12 still pass |
| M8 — Backend module boundaries | M7; baseline v1.4 | B08: restructure `apps/api` to Engineering E02 (module layout, `index.ts` public surfaces, repository ports with MongoDB adapters, one `DatabaseModule` for the connection, startup checks, and readiness, errors and budgets with one owner each) and enforce the dependency rules with `dependency-cruiser` in `npm run lint`. No route, response, cookie, schema, rate-limit, or database-policy change. Exit: T18 passes; T01–T17 still pass | Verified on the branch: T18 and `npm run check` pass, CI run #15 passed both jobs on `8d4872e`, and T14 and T17 passed again from a clean clone at `664da83`. Merged to `main` as `2ebef0e` (runs #17 and #18 passed) |
| M9 — Backend performance | M8 | B09: a repeatable local load command and baseline, then only the optimizations it justifies (first candidates: bounded password-hashing admission and the thread-pool size; the linearizable session read is measured and its options put to the user). Exit: T19 passes; T01–T18 still pass | Verified: T19 passes and `npm run check` passes. No code optimization adopted; the user kept linearizable session reads (EV-DATA-01). Merged to `main` as `2ebef0e` |
| M10 — Frontend structure | M9 merged; baseline v1.5 | B10: fix the password toggle's label/state conflict and the request errors screen readers may miss; split the signup/signin form into explicit components with route guards apart from pages; make `ui/` presentational and enforce the web layout in `npm run lint`; declare the auth context type; tidy the API client; move global styles and colors into `src/global.css`. No route, copy, API, session-state, or cache change. Exit: T20 passes; T01–T19 still pass | Verified on the branch: T20 and `npm run check` pass on `ec1c2ea`; an independent review's findings fixed. Pushed at the user's request; CI runs #20 and #21 passed both jobs on `f018e9c`; pull request #2 open, not merged |

The dependency path is M1 → M2 → M3 integration → M4 → M5 → M6 publication → M7 → M6 handoff. Baseline v1.4 adds M8 → M9 on the branch `refactor/m8-backend-structure`; the handoff does not wait for them (see the M8 decisions). Baseline v1.5 adds M10 on `refactor/m10-frontend-structure`, from `main` after M9's merge; the handoff does not wait for it either. After M1, the UI shell and backend work can run in parallel against the frozen contracts; shared-contract edits must be coordinated. Do not parallelize competing edits to the same contract or use a UI mock as proof that the backend works.

## Current handoff — 2026-10-22 (M10 verified on the branch)

- **Completed:** M10 on `refactor/m10-frontend-structure` (not pushed): T20 passes, `npm run check` passes on `ec1c2ea` (73 contracts / 154 API / 48 web tests, 10 Chromium cases), and an independent review's two Medium and five Low findings are fixed or kept by recorded decision. `main` is unchanged at `63149e4` and stays **ready for handoff**.
- **Unfinished:** CI on M10 (needs a push or pull request); the optional VoiceOver spot check (steps in the M10 result); T15 on `main`.
- **Decisions to retain:** everything below, plus the M10 decisions and result: the application page composes `RequireSession` inside itself; `useAuthForm` holds the shared form policy; background session notices stay `role="status"`; the web layer rules are transitive.
- **Blockers:** pushing, a pull request, merging, and the recruiter handoff each need the user's instruction. If M10 merges first, the recruiter message is re-prepared with the new head.
- **Next concrete task:** when the user says so, merge pull request #2; then CI runs on `main` (T13), and the recruiter message is re-prepared with the new head if the handoff has not happened yet.
- **Added 2026-10-22:** at the user's request the branch was pushed, CI dispatched on it (run #20), and pull request #2 opened (run #21); both runs passed both jobs on `f018e9c`.

## Previous handoff — 2026-10-22 (baseline v1.5, M10 planned)

- **Completed:** everything in the handoff below. `main` is unchanged at `63149e4`, whose push run #19 passed both jobs (check job 1 min 22 s, Docker-only job 52 s), and stays **ready for handoff**; the prepared recruiter message below still names `63149e4`.
- **Changed:** the user asked for a frontend review with four review skills (engineering judgment, React performance, composition patterns, web interface guidelines) and approved the proposed plan ("go-ahead"). Baseline v1.5 adds B10 (Requirements), Engineering E05's v1.5 layout, T20 (Verification), M10 below, and eight Evolution register entries (EV-WEB-05 to EV-WEB-11, EV-TEST-05). Work happens on `refactor/m10-frontend-structure`, created from `63149e4`.
- **Unfinished:** M10 (nothing implemented); T15 on `main`.
- **Decisions to retain:** everything in the earlier handoffs, plus the M10 decisions below.
- **Blockers:** none for M10. Pushing, opening a pull request, merging, and the recruiter handoff each need the user's instruction.
- **Next concrete task:** M10 step 1, the accessibility fixes, test-first.

## Previous handoff — 2026-10-22 (M8 and M9 merged, ready for handoff)

- **Completed:** M0–M5, M6's publication, M7, M8, and M9. The user merged pull request #1 into `main` as `2ebef0e`; pull-request run #17 passed both jobs on the merged head `75119ee` (check job 2 min 5 s, Docker-only job 51 s); the user merged pull request #1 as merge commit `2ebef0e`, whose tree equals `75119ee`, and push run #18 on `main` passed both jobs (check job 1 min 50 s, Docker-only job 54 s). T01–T14 and T16–T19 pass.
- **Unfinished:** T15, the recruiter link handoff. The state is **ready for handoff**, not **submitted**. The M7 message is superseded by the one below, which names the head of `main` after this record commit.
- **Decisions to retain:** everything in the earlier handoffs, plus the M8 and M9 results and the Evolution register's working rule.
- **Blockers:** the handoff needs the user's explicit instruction and the recipient. The merged branch `refactor/m8-backend-structure` can be deleted when the user wants.
- **Next concrete task:** when instructed, send the message below to the named recipient, then record the date, channel, and recipient role in T15 and set the state to **submitted**.

**Final recruiter message** (prepared; **not sent**; `<SHA>` is the head of `main` after this record commit, given in the handoff message):

> Subject: Full Stack Test Task submission
>
> Hi [recruiter name],
>
> Here is my submission for the Full Stack Test Task: https://github.com/HossamElAnsary/easygenerator-auth
>
> The submitted revision is commit `<SHA>` on `main`, and its GitHub Actions run passes.
>
> It implements signup (email, name, and password, validated on both the frontend and the backend), signin, and an authenticated page that shows "Welcome to the application.", using React with TypeScript, NestJS, and MongoDB. `GET /api/auth/me` is the protected endpoint; sessions are opaque, stored server-side, and carried in an HttpOnly cookie. Logout, API integration and real-browser tests, GitHub Actions CI, safe request logs, and Markdown API documentation are included.
>
> With Docker installed, `docker compose up --wait` runs the whole application at http://localhost:8080, with no Node setup needed. The README also covers local development with the pinned Node and npm versions, and AI.md records where AI assisted, which approaches worked, and where its output was corrected.
>
> Thank you for your time. I am happy to walk through any part of it.
>
> Best regards,
> Hossam

## Previous handoff — 2026-10-22 (M9 verified on the branch)

- **Completed:** M9 on `refactor/m8-backend-structure`, pushed at the user's request; CI run #16 (dispatched on the branch) passed both jobs on `08666d5`: `npm run bench` and its recorded baseline (T19), the unit tests beside their sources, per-deployment thread-pool guidance, and the measured session-read options. `main` is unchanged at `f36ab64` and stays **ready for handoff**.
- **Unfinished:** the pull request's CI on the merged head, then the user's decision to merge; T15 on `main`.
- **Decisions to retain:** the M9 result below: no hashing admission control (EV-PERF-01, deferred), no default `UV_THREADPOOL_SIZE` (EV-PERF-02), linearizable session reads unchanged, and the benchmark's own-database guard.
- **Blockers:** merging and the recruiter handoff each need the user.
- **Next concrete task:** when the user says so, merge the pull request; then CI runs on `main` (T13), and the recruiter message is re-prepared with the new head SHA if the handoff has not happened yet.
- **Added 2026-10-22:** T14 and T17 passed again from a clean clone at `664da83` (Verification M9 merge-readiness evidence), and a pull request was opened from the branch to `main`.

## Previous handoff — 2026-10-21 (M8 verified on the branch)

- **Completed:** M8 on `refactor/m8-backend-structure`, pushed to `origin` at the user's request (no pull request): the API follows Engineering E02, `npm run lint` enforces its rules, T18 passes, `npm run check` passes, and CI run #15 (dispatched on the branch) passed both jobs on `8d4872e`. `main` is unchanged at `f36ab64` and stays **ready for handoff**.
- **Unfinished:** M9 (nothing implemented). Before M8 merges: the README walkthrough (T14) and a clean-clone Docker-only run (T17). T15 on `main`.
- **Decisions to retain:** everything below, plus the M8 result: `DatabaseModule` is global (the `@nestjs/mongoose` constraint), rule 4 covers the driver packages, and indexes are declared per module and applied by the composition root.
- **Blockers:** opening a pull request, merging, and the recruiter handoff each need the user's instruction. Branch pushes do not trigger CI; dispatch it on the branch (`gh workflow run ci.yml --ref refactor/m8-backend-structure`) or open a pull request.
- **Next concrete task:** M9 step 1: the baseline gate on M8's head, then the test-placement move.
- **Added 2026-10-22:** the [Evolution register](evolution.md), seeded with 29 entries from decisions already recorded, and Engineering E06's test-placement convention.

## Previous handoff — 2026-10-21 (baseline v1.4, M8 and M9 planned)

- **Completed:** M0–M5, M6's publication, and M7, as in the previous handoff. `main` is unchanged at `f36ab64` and stays **ready for handoff**.
- **Changed:** the user started a backend optimization phase. They asked for clear separation of concerns (a data layer with repositories, a business layer, controllers, configuration), a modular monolith, and an opinion on what is missing, and asked to compare the structure of their NestJS template (`template-projects/nestjs-template`). Baseline v1.4 adds B08 and B09 (Requirements), the E02–E04 target design (Engineering), T18 and T19 (Verification), and M8 and M9 below. Planning happens on the branch `refactor/m8-backend-structure`, created from `f36ab64`.
- **Unfinished:** M8 and M9 (nothing implemented); T15 on `main`.
- **Decisions to retain:** everything in the earlier handoffs, plus the M8 and M9 decisions below.
- **Blockers:** none for M8. Pushing the branch, opening a pull request, merging to `main`, and the recruiter handoff each need the user's instruction.
- **Next concrete task:** M8 step 1, the baseline gate on the branch before any edit.

## Previous handoff — 2026-10-21 (after M7, ready for handoff)

- **Completed:** M0–M5, M6's publication, and M7. M7 is `b595ee7` (Docker files, Compose, CI), `1cb61c4` (README, `docs/api.md`, `docs/development.md`), `80446ee` (independent-review fixes), and `f74212e` (a troubleshooting note), plus its evidence commit, all on the public `origin/main`. Someone with only Docker runs `docker compose up --wait` and opens `http://localhost:8080`. T01–T14, T16, and T17 pass; run #13 passed both CI jobs on `f74212e`. The evidence commit's own run is reported in the M7 handoff message.
- **Unfinished:** T15. The M6 recruiter text is superseded; the M7 result has the re-prepared message, which names the head SHA given in the M7 handoff message. Nothing was sent. The state is **ready for handoff**, not **submitted**.
- **Decisions to retain:** everything in the earlier handoffs, plus A12 as built: the documented command is `docker compose up --wait` (not `--build`, which recreates containers on Docker Desktop); images keep Compose's `<project>-<service>` names and are never pulled; `mongodb-init` builds its own copy of the MongoDB image; health checks use a plain 10-second interval (no `start_interval`, which needs Engine 25+); the proxy streams request bodies.
- **Runtime and test setup:** as before, plus: the default Compose project now builds four local images; only `mongodb` runs after M7's cleanup, and its volume holds no application data.
- **Blockers:** the handoff needs the user's explicit instruction and the recipient. Nothing else is open.
- **Next concrete task:** when instructed, send the M7 message to the named recipient, then record the date, channel, and recipient role (not the address) in T15, mark R09 and M6 accordingly, and set the state to **submitted**.

## Previous handoff — 2026-10-21 (baseline v1.3, M7 planned)

- **Completed:** M0–M5 and M6's publication (previous handoff below). The M6 record commit `f7776e8` is the public head, and its push run #11 passed every step on `ubuntu-24.04` image 20261018.339.1 with kernel 7.0.0-1017-azure.
- **Changed:** the user asked how someone without Node runs the project. Today nobody can: Docker runs only MongoDB, and everything else needs Node 24.22.0 and npm 12.2.0. The user requested a Dockerfile per service, one Compose file that builds and runs everything, and a shorter README in the right order. Baseline v1.3 adds B07 (Requirements), A12 (Architecture), T17 and extended T13, T14, and T16 (Verification), and M7 below. The recruiter handoff now follows M7, so the M6 message prepared earlier is superseded; it is re-prepared with M7's head SHA.
- **Unfinished:** M7 (nothing implemented), then T15.
- **Decisions to retain:** everything in the previous handoffs, plus A12: one `app` image (the API serving the compiled UI), a `proxy` image, and a `mongodb` image with the init script copied in, sharing `mongodb`'s network namespace. That keeps the loopback listener, `TRUST_PROXY=127.0.0.1`, and the `localhost:27018` member unchanged. The default `docker compose up` runs the whole application; the Node workflow and CI use `docker compose up -d mongodb`.
- **Blockers:** none for M7. The handoff still needs the user's explicit instruction and the recipient.
- **Next concrete task:** M7 step 1, the baseline gate before any edit.

## Previous handoff — 2026-10-21 (M6, ready for handoff)

- **Completed:** M0–M5, and M6's publication. `HossamElAnsary/easygenerator-auth` is public at https://github.com/HossamElAnsary/easygenerator-auth with the prepared description. A logged-out view showed `main` at `6b68db7` and README.md and AI.md byte-identical to the local files. Run #10 passed on `6b68db7`, so T13 passes. Before publication, the scan of every commit since `5dfebb3` and of the whole history found no credential or artifact, and `npm run check` passed (255 workspace and 10 Chromium tests). The documentation commit that records M6 sits on top of `6b68db7`; its own CI run is reported in the M6 handoff message.
- **Unfinished:** T15, the recruiter link handoff. The final message (M6 result) has been prepared and shown to the user, and has not been sent. The state is **ready for handoff**, not **submitted**.
- **Decisions to retain:** everything listed in the previous handoff below, unchanged. No code, configuration, or repository setting other than visibility and description changed in M6.
- **Blockers:** the handoff needs the user's explicit instruction to send and the recruiter's contact. Nothing else is open.
- **Next concrete task:** when instructed, send the M6 message to the named recipient, then record the date, channel, and recipient role (not the address) in T15, mark R09 and M6 accordingly, and set the state to **submitted**.

## Previous handoff — 2026-10-21 (after M5)

- **Completed:** M0–M5. M5 is revisions `76fd472`, `c25c6da`, `32cd707`, `3a178a0`, `88cc7c1`, and `b136c59` plus its evidence commits, all pushed to the private `origin/main`. T01–T12, T14, and T16 pass. Every requirement except R09 (public repository and handoff) and B03 (CI on the submitted revision) has passing evidence (Verification, M5 requirement reconciliation). `npm run check` passed lint/format, strict typecheck, **255 workspace tests (73 contracts, 142 API, 40 web)**, builds, and **10 Chromium tests**, against MongoDB 7.0.45 in the worktree and in a clean clone. Private CI: run #5 (`32cd707`) passed; run #6 (`ccdd621`) failed because GitHub's new runner kernel makes MongoDB 8.0 refuse to start; `b136c59` moved to MongoDB 7.0.45, and its runs are listed in Verification. The run on the last evidence commit is reported in the M5 handoff message, not here.
- **Unfinished:** M6. The repository is still private. T13 stays Pending until the submitted public revision has a passing run, and T15 until the recruiter link handoff is confirmed. No deployment exists, and nothing was sent.
- **Decisions to retain:** baseline v1.2, M2's contract clarifications, and M4's configuration clarifications. Production requires `TRUST_PROXY` covering `127.0.0.1` (the API listens on loopback only). Development, test, and preview accept only loopback origins. `MONGODB_URI` carries no policy options. The browser bundle runs Zod jitless under an unchanged CSP. Retained from M3: React/RHF/shared Zod/TanStack/native fetch; opaque HttpOnly sessions; read-only session checks; exact origins (`http://localhost:5173` dev, `http://localhost:3000` compiled test/preview); production rate limits 5/10/30/120. From M5: the SPA shell is sent relative to the web directory, so the install path never decides what is hidden; MongoDB is pinned to 7.0.45 on the volume `mongodb-data-7.0`, because 8.0 refuses Linux kernels 6.19 through 7.0.13 (do not move to 8.x until a release starts there).
- **Runtime and test setup:** Node 24.22.0/npm 12.2.0 in nvm (`source ~/.nvm/nvm.sh && nvm use`). Docker's project replica set is on 27018, and 27017 was untouched; recheck `npm run db:ready` before resuming. Every checkout shares that Compose project (see CLAUDE.md). The original checkout's `main` is still `5dfebb3`, with MongoDB 8.0.32 on the old volume; after `git pull --ff-only` there, `docker compose up -d && npm run db:ready` moves it to 7.0.45 on a fresh volume, and the old `easy-generator_mongodb-data` volume can then be removed. Playwright 1.64.1 / Chromium 1248 is in ignored `.cache/ms-playwright`; browser cases own port 3000 and create/drop only their own generated databases. CI is `.github/workflows/ci.yml`.
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

Revisions on `main`, pushed to the private `origin`: `76fd472` (SPA shell from any install path), `c25c6da` (walkthrough fixes), `32cd707` (ignore the browser tool's output), `3a178a0` and `88cc7c1` (independent-review fixes), `ccdd621` (evidence), `b136c59` (MongoDB 7.0.45), then a final evidence commit. Another Claude Code session shared the checkout, so M5 ran in an isolated Git worktree branched from `5dfebb3`. The tasks ran in the documented order; exact commands and results are in Verification's M5 evidence.

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
7. **CI and the runners' new kernel.** After the evidence commit `ccdd621` was pushed, run #6 failed `db:ready`. The failure-diagnostics step showed why: the MongoDB container exited at startup with `MongoDB cannot start: Linux kernel versions 6.19 and newer has a known incompatibility with this version of MongoDB` (SERVER-121912). GitHub had begun rolling out `ubuntu-24.04` image 20261018.339, with kernel 7.0.0-1017-azure, in place of 20261012.334 with 6.17.0-1022-azure. MongoDB's 8.0 release notes confirm the refusal for kernels 6.19 through 7.0.13, with no fixed 8.0 release and no supported override; on Ubuntu even 7.0.14-based kernels stay blocked (SERVER-136848). The same would stop a reviewer on a current Linux kernel. `b136c59` pins MongoDB 7.0.45 (supported until 2027-08-31) under a volume named per major version, and the workflow now prints the runner's kernel. The full gate passed against 7.0.45 in the worktree and in a clean clone on a fresh volume; the CI runs on `b136c59` are listed in Verification.

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
- MongoDB 7.0 reaches end of life on 2027-08-31; moving back to 8.x waits for a release that starts on kernels 6.19 through 7.0.13. Checkouts that ran an earlier revision keep an unused 8.0 volume until removed (README).
- The walkthrough ran on macOS arm64; Linux x64 is covered by CI only. The session's command isolation refused sourcing `nvm.sh`, so the official Node 24.22.0 tarball (checksum verified) stood in for `nvm install`; every later step followed README. Interactive-zsh comment handling comes from zsh's manual, because the same isolation refused an interactive shell.
- Accepted observations, not defects: a favicon 404 and the anonymous session check's 401 appear in the browser console; axe's best-practice `page-has-heading-one` on the session-unavailable screen; `npm ls` flags ESLint's `ajv` against `@hookform/resolvers`' unused optional peer.

## M6 — Submission

Use the user's authorization at the time of submission to create/push the public repository and, if explicitly instructed, send the recruiter message. Repository owner/name and recruiter contact are not needed to finish planning or local implementation. They are deferred handoff inputs; do not invent them.

Verify the public repository, submitted commit, README, AI.md, and CI result. Provide the repository URL and prepared handoff text if sending is not authorized or the recruiter address is unavailable. Record that state as **ready for handoff**, not **submitted**. T15 passes only when the required link handoff is confirmed.

### M6 result — 2026-10-21

The user authorized making the repository public, setting the prepared description, and pushing M6 documentation commits after `npm run check` passed. Sending the recruiter message, releases, deployment, history rewrites, and other repository settings were not authorized, and none happened. The steps ran in the requested order. Exact commands and results are in Verification's M6 evidence.

1. **Re-verification before publishing.** The working tree was clean, with `main` at `origin/main` (`6b68db7`). A credential and artifact scan covered every blob added since `5dfebb3` (8 commits, 23 blobs) and then the whole history (25 commits, 211 blobs), with a positive control proving the patterns fire. It found only synthetic test values and the dummy README address. Brief copies, `.env`, caches, build output, and test results are still ignored and untracked, and `npm run check` passed. The session-start notice of another session in the checkout was stale: that process had exited, and the detector was counting this session itself, so no worktree was needed.
2. **Publication.** The repository was made public, and its description was set to the text prepared in M5. Only `main` existed on the remote, with no tags or releases.
3. **Logged-out verification.** Unauthenticated `curl` saw the repository, `AI.md`, and commit pages (200), the prepared description, and `main` at `6b68db7`. README.md and AI.md served from raw.githubusercontent.com at that SHA match the local files byte for byte.
4. **CI for the submitted revision (T13).** Run #10, triggered by the push of `6b68db7`, passed every step on `ubuntu-24.04` image 20261012.334.1 with kernel 6.17.0-1022-azure. The same code passed run #9 on kernel 7.0.0-1017-azure. No new dispatch was needed.
5. **Records.** Verification (T13 Pass; T15 Pending with its public-repository portion recorded; release-gate status), this document, AI.md, PLAN.md, and README now say **ready for handoff**. The commit carrying these records changes only Markdown documentation. Its own push run, and its SHA as the submitted revision, are reported in the M6 handoff message rather than recorded in the commit itself.

**Final recruiter message** (prepared and shown to the user; **not sent**. `<SHA>` is the head of `main` after the M6 record commit, given in the M6 handoff message):

> Subject: Full Stack Test Task submission
>
> Hi [recruiter name],
>
> Here is my submission for the Full Stack Test Task: https://github.com/HossamElAnsary/easygenerator-auth
>
> The submitted revision is commit `<SHA>` on `main`, and its GitHub Actions run passes.
>
> It implements signup (email, name, and password, validated on both the frontend and the backend), signin, and an authenticated page that shows "Welcome to the application.", using React with TypeScript, NestJS, and MongoDB. `GET /api/auth/me` is the protected endpoint; sessions are opaque, stored server-side, and carried in an HttpOnly cookie. Logout, API integration and real-browser tests, GitHub Actions CI, safe request logs, and Markdown API documentation are included.
>
> The README explains setup with Docker and the pinned Node/npm versions. AI.md records where AI assisted, which approaches worked, and where its output was corrected.
>
> Thank you for your time. I am happy to walk through any part of it.
>
> Best regards,
> Hossam

**Remaining limitations:** those listed in the M5 result, except that the repository is now public and T13 passes. The recruiter handoff (T15) is the only open M6 item.

## M7 — Docker-only run and README

Requested by the user on 2026-10-21 after M6's publication. Baseline v1.3 adds B07 and restructures the README; Architecture A12 owns the container design. Work in this order and keep every existing contract: no route, response, cookie, schema, rate-limit, or database-policy change.

1. **Baseline.** Run `npm run check` before any edit and keep its output. Record the current README size (21.5 KB, 145 lines).
2. **MongoDB image.** Add `docker/mongodb/Dockerfile` (the pinned `mongo:7.0.45` digest, `mongo-init.js` copied to its current container path, the existing `mongod` command) and the one-shot `mongodb-init` service with a JavaScript wait before the existing script. Remove the bind mount. Keep the project name, ports, healthcheck, and the volume `mongodb-data-7.0`. Prove that `docker compose up -d mongodb` plus `npm run db:ready` still works on the existing volume, with its data unchanged.
3. **Build inputs.** Add a root `.dockerignore`, and check the actual build context for env files, brief copies, dependencies, outputs, caches, and `.git`.
4. **Application image.** Add `docker/app/Dockerfile`: a multi-stage build on `node:24.22.0` slim (pinned by digest) with npm 12.2.0; `npm ci` from the lockfile with the existing `allowScripts`; contracts, API, and web builds. The runtime stage holds compiled output and production dependencies only, runs as `node`, includes a Node healthcheck, and uses `node apps/api/dist/main.js` as the command. Build it on arm64 locally and on amd64 in CI, and inspect its file list and size.
5. **Proxy image and Compose stack.** Add `docker/proxy/Dockerfile` (unprivileged nginx pinned by digest) and its configuration: listen on 8080, forward everything to `127.0.0.1:3000`, overwrite `X-Forwarded-For`, preserve `Host` and `Origin`, hide the server version. Add `app` and `proxy` to `compose.yaml` with `network_mode: service:mongodb`, the A12 settings and startup conditions, and loopback ports with `APP_PORT`.
6. **Local verification (T17).** Clone into a temporary directory and run `docker compose up --build --wait` through a Node-free Docker CLI (the official `docker` CLI image with the host socket), then again to prove idempotence. Drive the journey in Chromium at `http://localhost:8080` and watch for CSP reports. Use curl through the proxy for direct routes, assets, JSON misses, the rejected-origin case, and a spoofed `X-Forwarded-For`. Run `down`/`up` for persistence, inspect the users and published ports, test `APP_PORT`, and time a clean stop. Then run the Node workflow and `npm run check` on the same volume.
7. **CI.** Change the database step to `docker compose up -d mongodb`. Add a parallel job that builds the images and smoke-tests the stack with curl: health, the SPA shell and its CSP, and signup → signin → me → logout through the proxy. Keep read-only permissions, actions pinned by SHA, no secrets, no registry push. Lint the workflow with actionlint.
8. **README and documentation.** Rewrite README in this order: what it is; quick start with Docker; features; local development with Node; tests and checks; configuration; API overview; project structure; design and security highlights; limitations; links. Move the full API contract and curl example to `docs/api.md` (B05). Move test isolation, the browser suite, CI, production topology, and troubleshooting (the `localhost` versus `127.0.0.1` origin, a busy port 3000, the old 8.0 volume) to `docs/development.md`. Drop what other files own: exact package pins (manifests), MongoDB version history (A08), frontend state (A11), and milestone history (Delivery). Update CLAUDE.md's commands and Compose notes and AGENTS.md's location table.
9. **Review and gates.** Have an independent read-only review cover the Dockerfiles, Compose, and proxy configuration against A02, A07, A08, and A12 (T16). Walk both README paths from a clean clone (T14). Run `npm run check`, push with the existing authorization, and confirm CI on the new head (T13).
10. **Handoff preparation.** Re-prepare the recruiter message with M7's head SHA and, if accurate, one sentence about the Docker quick start. Send only when instructed (T15).

Exit evidence: T17 passes; T13, T14, and T16 pass on M7's head; T01–T12 still pass. A Docker run that works only on the author's machine, or a README path not walked from a clean clone, does not close M7.

### M7 result — 2026-10-21

The user approved the v1.3 plan ("go-ahead"), which covered implementing M7 and pushing it after `npm run check` passed. The tasks ran in the documented order; exact commands and results are in Verification's M7 evidence.

1. **Baseline.** `npm run check` passed at `23a6e5d` before any edit.
2. **MongoDB image.** `docker/mongodb/Dockerfile` copies `mongo-init.js` and a JavaScript wait into the pinned image, and replaces the bind mount. The existing container was recreated from it on the same volume, with its replica-set configuration and a marker intact, and `db:ready` still works.
3. **Build inputs.** `.dockerignore` keeps the context to tracked sources, which was verified by listing the actual context.
4. **Application image.** `docker/app/Dockerfile` builds from the lockfile with the pinned Node and npm. Its runtime stage has only compiled output and the API's production dependencies, runs as `node`, and carries no package manager.
5. **Proxy and Compose.** `docker/proxy` (unprivileged nginx) forwards everything to `127.0.0.1:3000`, overwrites `X-Forwarded-For`, and streams bodies. `compose.yaml` adds `mongodb-init`, `app`, and `proxy` in `mongodb`'s network namespace, with loopback ports and `APP_PORT`.
6. **Verification.** T17 passed locally and from a clean clone through a Node-free Docker CLI.
7. **CI.** The database step became `docker compose up -d mongodb`, and a parallel `docker` job runs the quick start and a curl smoke test. Run #13 passed both jobs.
8. **Documentation.** README was rewritten (8.7 KB, from 21.5 KB); `docs/api.md` and `docs/development.md` took over the API contract and the details; CLAUDE.md and AGENTS.md were updated.
9. **Review and gates.** An independent review found one Medium and six Low issues, all fixed. Both README paths were walked from a clean clone, and `npm run check` passed there, in the checkout, and with the stack running.

Decisions made during implementation (change log below):

- **Documented command `docker compose up --wait`.** On Docker Desktop's containerd image store, BuildKit's default provenance attestation gives every build a new image ID, so `up --build` recreated every container even with nothing changed. Compose 2.33 has no setting to turn the attestation off. `up --wait` builds missing images and leaves running containers alone; `--build` is documented for after pulling changes.
- **Compose's default image names.** Registry-style names such as `easy-generator/app:local` sit in a Docker Hub namespace someone else could claim, and Compose may pull a missing image under such a name. `<project>-<service>` names are built locally and never pulled. `mongodb-init` therefore builds its own copy of the MongoDB image (same cached layers), which also makes the stack work under any project name. A clean-clone run had passed only because the default project's image happened to exist.
- **No `start_interval`.** It needs Docker Engine 25 or later, which older distribution packages lack. A plain 10-second interval costs about 10 seconds of startup.
- **Streamed request bodies.** With nginx's default buffering, the proxy read every body up to 1 MiB before the API's request controls ran. With buffering off, a rejected 900 KB request got its JSON 403 in 7 ms. Bodies over 1 MiB still get nginx's HTML 413, which is documented rather than custom-handled.

**Final recruiter message** (prepared; **not sent**; `<SHA>` is the head of `main` after the M7 evidence commit, given in the M7 handoff message):

> Subject: Full Stack Test Task submission
>
> Hi [recruiter name],
>
> Here is my submission for the Full Stack Test Task: https://github.com/HossamElAnsary/easygenerator-auth
>
> The submitted revision is commit `<SHA>` on `main`, and its GitHub Actions run passes.
>
> It implements signup (email, name, and password, validated on both the frontend and the backend), signin, and an authenticated page that shows "Welcome to the application.", using React with TypeScript, NestJS, and MongoDB. `GET /api/auth/me` is the protected endpoint; sessions are opaque, stored server-side, and carried in an HttpOnly cookie. Logout, API integration and real-browser tests, GitHub Actions CI, safe request logs, and Markdown API documentation are included.
>
> With Docker installed, `docker compose up --wait` runs the whole application at http://localhost:8080, with no Node setup needed. The README also covers local development with the pinned Node and npm versions, and AI.md records where AI assisted, which approaches worked, and where its output was corrected.
>
> Thank you for your time. I am happy to walk through any part of it.
>
> Best regards,
> Hossam

**Remaining limitations:** those in the M5 result, except that the repository is public and T13 passes; plus, for the Docker stack: Windows is unverified, Docker Desktop may count every local browser as one rate-limit client, a body over 1 MiB gets nginx's HTML 413, and the stack is a loopback HTTP preview, not a deployment.

## M8 — Backend module boundaries

Requested by the user on 2026-10-21 as the first step of a backend optimization phase. Baseline v1.4 adds B08; Engineering E02–E04 own the target design and T18 the acceptance. Every existing contract holds: no route, response, cookie, schema, rate-limit, logging, or database-policy change. Work on `refactor/m8-backend-structure`, in this order.

1. **Baseline.** Run `npm run check` on the branch before any edit and keep its output. Record the current `apps/api/src` file list and the API test count (142).
2. **Rules before moves.** Add `dependency-cruiser`, pinned exactly (check its engines, its TypeScript 6 parsing, and that it needs no `allowScripts` entry). Write E02's five rules for `apps/api/src` and add them to `npm run lint`. Run them on the v1.3 tree and record what they report, for example `database/startup-indexes.ts` importing both services and the services importing Mongoose. That list is the failing test the restructure must clear.
3. **Layout.** Move files with `git mv` into E02's layout (composition root, `config/`, `common/`, `infrastructure/`, `http/`, `modules/`) and add each feature module's `index.ts`. Keep `.js` relative imports and explicit `@Inject`. Update the `db:ready` script for the initializer's new compiled path.
4. **Database module.** Move the connection provider out of `CoreModule` into `DatabaseModule` with `DatabaseService`, registered once by the composition root (global; see the change log). Each module exports its collection's index specification; the startup gate in the composition root verifies them before readiness, in the same order as today.
5. **Ports and adapters.** Add the `UsersRepository` and `SessionsRepository` ports and their MongoDB adapters. Move session policy (token, lifetime, expiry, revocation confirmation) into `SessionsService` on top of its port. Keep `withDatabase()` at every driver call inside the adapters. `AuthService` uses the repository's projection instead of rebuilding the public user.
6. **One owner each.** Split request-control and validation errors into `http/`, keeping domain and dependency errors in `common/`. Name the 5-second database budget once, and the HTTP timeouts and the 16 KiB body limit next to their owner.
7. **Tests.** Existing suites change only import paths and provider tokens; no assertion changes. Add `SessionsService` unit tests against a contract-faithful fake: malformed tokens make no repository call, the exact expiry boundary, and revocation that deletes nothing then finds the session (503) or finds nothing (success). Show each new test failing against a deliberate mutation.
8. **Documentation.** Update CLAUDE.md's code map and paths, AGENTS.md's `apps/api` row, README's project structure, and `docs/development.md` where they name moved files.
9. **Review and gates.** Probe each rule with a deliberate violation (T18), then remove the probes. Have an independent read-only review check the diff against E02–E04 and the unchanged contracts (T16). Run `npm run check`. Push the branch or open a pull request only when the user says so; CI runs on pull requests.

Exit evidence: T18 passes and T01–T17 still pass locally on M8's head. T13 on M8's code needs a pushed branch or pull request, which waits for the user's instruction.

### M8 decisions and open questions — 2026-10-21

**Needs your eyes** (the calls the user may want to overturn, with what reversing them costs):

1. **Two-layer repositories, not the template's three.** Port (an abstract class that is also the injection token) bound straight to its MongoDB adapter. The template's wrapper layer (`RefreshTokenRepository`) only forwards each method to its Prisma class, so it adds code without a boundary. Reversal cost: low; a wrapper can be inserted later behind the same token.
2. **A repository port at all.** The alternative was renaming `UsersService` to `UsersRepository` without ports. Ports were chosen because rule 4 (no Mongoose in policy code) then becomes checkable and session policy unit-testable. Cost: four more files. Reversal cost: low (bind the adapter class directly).
3. **The handoff does not wait for M8/M9.** `main` stays the submitted candidate at `f36ab64`. If M8 or M9 merges first, T13, T14, and T16 run again on the new head and the recruiter message is re-prepared with its SHA. Reversal cost: none.

Other decisions:

- **What was taken from the template:** boundaries enforced with `dependency-cruiser`; `index.ts` as each module's only public surface; abstract-class ports as tokens; no ORM types outside adapters; infrastructure (vendor-bound) separate from `common/` (vendor-free); orchestration in one named place (`AuthService`, which plays the template's application-layer role). The template's explicit database-module imports were planned too, but `@nestjs/mongoose` cannot support them (see the change log).
- **What was not taken, and why:** the pass-through wrapper (above); entity classes (`create`/`rehydrate`/`toPersistence`/`toPublic`) for a three-field user; a global module re-exporting its sub-modules and the "transitional" re-exports of internals in a public barrel, which is how that template's boundary eroded; a facade per area for a single consumer; `new Date()` inside repositories (our injected `Clock` stays); `TimeoutInterceptor`, which does not cancel the underlying work; class-validator DTOs, JWT/refresh tokens, Redis, queues, the outbox, the `@/` path alias, and Swagger decorators, each of which conflicts with a recorded decision or exclusion.
- **No interceptors, extra pipes, `utils`/`helpers` folders, or TypeScript enums.** Request logging must stay Express middleware to see requests that never reach a handler (404, request-control 403/415, body-parser 413). The one schema pipe covers every input. The contracts package already shares string unions and Zod enums with the web app.
- **The kernel stays global.** Validated configuration, `AppLogger`, and `Clock` are vendor-free and used everywhere. (The plan first made the database connection an explicit import; M8 found that `@nestjs/mongoose` cannot support that, see the change log.)
- **`@Public()` stays in `auth`** next to `SessionGuard`, which gives it meaning (A09), and is exported through `auth`'s `index.ts`; `health` imports it from there.
- **Rule scope.** The rules cover `apps/api/src` only (from M9, including the unit tests that sit there). Integration tests may import internals, because fault-injection suites reach models and providers directly. The web app keeps its current structure (E05).

### M8 result — 2026-10-21

The user approved the v1.4 plan ("go-ahead"), which covered committing it and starting M8 on the branch. The tasks ran in the documented order; exact commands and results are in Verification's M8 evidence.

1. **Baseline.** `npm run check` passed on `23ad6e7` before any edit (255 workspace and 10 Chromium tests).
2. **Rules before moves.** `dependency-cruiser` 18.7.0 with E02's rules in `npm run lint`; on the v1.3 tree it reported 15 violations, the failing test the restructure had to clear.
3. **Layout.** `git mv` into E02's layout, with an `index.ts` per module; `db:ready` now runs the initializer from `dist/infrastructure/database/`.
4. **Database module.** The connection, `DatabaseService`, and the `StartupIndexes` port are in `DatabaseModule.forRoot(RequiredIndexes)`; `RequiredIndexes` in the composition root applies each module's declared indexes in the previous order.
5. **Ports and adapters.** `UsersRepository` and `SessionsRepository` with MongoDB adapters that keep the exact v1.3 driver calls (the fault-injection suites spy on them); `SessionsService` holds token, lifetime, expiry, and confirmation policy; `PasswordHasher` and its Argon2 adapter are separate files.
6. **One owner each.** Request errors in `http/`, domain and dependency errors in `common/`; `DATABASE_BUDGET_MS`, `JSON_BODY_LIMIT`, and the HTTP timeouts named once.
7. **Tests.** Existing assertions unchanged; 12 policy unit tests, mutation-checked.
8. **Documentation.** CLAUDE.md's API section, AGENTS.md's `apps/api` row, and README's structure line.
9. **Review and gates.** All rule probes failed as intended; the independent review found no correctness or security defect and three enforcement gaps, all fixed; the final `npm run check` passed. Nothing was pushed.

Decisions made during implementation (change log below):

- **`DatabaseModule` is global.** The plan made it an explicit import. `@nestjs/mongoose` 12.0.0's `forFeature()` returns a module with no imports whose model providers inject the connection token, so the token must resolve application-wide; that is why the library's own core module is global. `forFeatureAsync()` accepts imports, but then the startup gate and readiness would need a second module. Keeping one global module registered once by the composition root preserves every other boundary: `infrastructure/` still imports no module.
- **Indexes are declared by modules and applied by the composition root.** Each module's `*.indexes.ts` names its collection and indexes and is exported through `index.ts`; `RequiredIndexes` reads the collections from the connection. That removed the v1.3 dependency of `database/startup-indexes.ts` on both feature services.
- **Rule 4 covers the driver packages and only the two persistence module files**, and a new rule keeps adapters and schemas out of every `index.ts`, after the review showed the first version could miss both.
- **`dependency-cruiser` resolves without `tsConfig`.** Its TypeScript-config reader resolved the `extends` path relative to the wrong directory; plain resolution handles the NodeNext `.js` imports, and `unresolvable-import` fails the gate if it ever does not.

## M9 — Backend performance

Requested together with M8; starts from M8's head. Baseline v1.4 adds B09; T19 owns the acceptance. Measure before changing anything, and keep every change that touches a guarantee behind the user's decision.

1. **Baseline gate and test placement.** `npm run check` on M8's head. Then apply Engineering E06's test placement (EV-TEST-01): move `test/config.test.ts` to `src/config/runtime-config.test.ts` and `test/sessions-policy.test.ts` to `src/modules/sessions/sessions.service.test.ts` with `git mv`; add `src/**/*.test.ts` to the API's Vitest include; add a dependency rule that production code never imports a test file, and probe it; confirm no test file reaches `apps/api/dist` or the app image's build output. M9's new unit tests land beside their sources.
2. **Load command.** Add a pinned HTTP load generator and one documented command (planned name `npm run bench`) that builds, starts the compiled API on a free port against an isolated database, seeds accounts, runs T19's endpoint and concurrency matrix, and prints a table. Rate limits stay enabled; each simulated client gets its own `X-Forwarded-For` under `TRUST_PROXY=127.0.0.1`, as the test harness does. Nothing in `src/` changes for the benchmark.
3. **Baseline results.** Run it three times on M8's head and record the medians with the commit, machine, OS, Node, and MongoDB versions in Verification.
4. **Hypotheses, each tested before any change:**
   - *Password hashing queues on libuv's thread pool.* Argon2 runs there (4 threads by default), sharing it with `dns.lookup`. Expected signs: signin latency rising with concurrency above 4, and `/api/health` slowing during signin load. Test: compare `UV_THREADPOOL_SIZE` values through the environment only.
   - *The linearizable session read dominates `/auth/me`.* M2 measured about 0.1 s per request, against single-digit milliseconds for the logout delete. Suspected cause: on the single-node set, the read's majority no-op write waits for the next journal commit (about 100 ms by default). Test: time `find` with linearizable versus majority read concern directly against the replica set, and read the server's journal commit interval.
5. **Hashing admission, only if 4 confirms queueing.** Record the contract addition in Architecture A05/A07 before code: at most N hashes in flight and a bounded wait, beyond which signup and signin answer `503 SERVICE_UNAVAILABLE` with `Retry-After` without hashing. Implement it test-first, set `UV_THREADPOOL_SIZE` where the measurements support it (README, `.env.example`, the app image), and measure again.
6. **Session read policy: options to the user, no change without a decision.** Present the measured cost and the options: keep linearizable reads (A10 as written); majority reads, with the stated risk that a deposed primary briefly accepts a revoked session; or another option the measurements surface. Any change updates A10 and its checks first.
7. **Gates.** `npm run check`, an independent review of the changes (T16), and T19's before/after table. Push or pull request only when the user says so.

Exit evidence: T19 passes; T01–T18 still pass. Laptop numbers on a single-node replica set are relative comparisons, not capacity claims.

### M9 result — 2026-10-22

The user said "go-ahead with M9". The tasks ran in the documented order; exact commands and results are in Verification's M9 evidence.

1. **Baseline gate and test placement.** `npm run check` passed on `3b0e0da`; the two unit tests now sit beside their sources, with the Vitest include and the `production-imports-test` rule (`7d49a90`).
2. **Load command.** `npm run bench` (`7d49a90`, safety and accuracy fixes in `4e39cfc`).
3. **Baseline results.** Three runs on `36cddc5`; medians in Verification.
4. **Hypotheses.** Both confirmed: hashing queues on the 4-thread pool without slowing other requests, and the linearizable read waits for the journal commit.
5. **Hashing admission: not implemented.** Its precondition (confirmed queueing) held, but the measurements removed its motivation: unrelated requests were not delayed, and per-IP limits bound each client. A new 503 path would change the API contract for an overload a single process does not reach at stage S1. Deferred as EV-PERF-01, with a trigger. The thread-pool size became per-deployment guidance in `docs/development.md` instead of a default (EV-PERF-02).
6. **Session read policy: options to the user, no change.** Keep linearizable reads; tune the journal commit interval; majority reads with a failover risk; or a hybrid. Recorded in EV-DATA-01 and A10.
7. **Gates.** An independent review (one medium safety gap, fixed), `npm run check`, and nothing pushed.

Decisions made during implementation (change log below):

- **A `node:http` load loop instead of a pinned load generator.** `autocannon` 8.0.0, the planned candidate, brought a moderate `uuid` advisory whose only offered fix was downgrading to autocannon 2. A closed-loop loop over keep-alive sockets measures the same thing in about 40 lines with no dependency, and `npm audit` stays at 0.
- **The benchmark guards its database like the test harness.** It refuses a test URI it cannot rewrite to `easy_generator_bench_<random>` and drops that database by name (from the review).
- **Rule scope widened by placement, not by edit.** Unit tests under `src/` are now inside the boundary rules; integration suites in `test/` stay outside.

## M10 — Frontend structure

Requested by the user on 2026-10-22: a review of `apps/web` with the engineering-judgment, React best-practices, composition-patterns, and web-interface-guidelines skills, then the proposed plan, approved with "go-ahead". Baseline v1.5 adds B10; Engineering E05 owns the target layout and T20 the acceptance. The review found no correctness or security defect in session handling, and measured no performance problem (one 131 KB gzip chunk, of which application code is 2.6%). Work on `refactor/m10-frontend-structure`, in this order.

1. **Accessibility fixes, test-first.** The password toggle drops `aria-pressed` and keeps its action label (`Show password` / `Hide password`); request-level errors render with `role="alert"` through a `ui/` `Alert`, while informational notices keep `role="status"`. Write the unit and browser assertions first, watch them fail, then change the code. Re-run axe in T11's states (a one-off scan outside the repository, as in M4) and attempt a VoiceOver spot check of both fixes; record the results under T11.
2. **Route guards and explicit forms.** `auth/guards.tsx` (`Home`, `PublicOnly`, `RequireSession`) and `SignupForm`/`SigninForm` composing `AuthFormFrame`, with one shared mapping of server field errors. `PasswordField` takes `autoComplete` and its hint as props. The routes lose their `key` props. Existing assertions in `App.test.tsx`, the coordinator and session tests, and the browser suite must pass unchanged; deliberate mutations prove they still guard the moved behavior.
3. **Layer tidying.** Move `errorMessage`, `useRequestError`, and `useWaitUntil` (with its test, by `git mv`) into `auth/`, so `ui/` imports no transport or auth code. Add the two web `dependency-cruiser` rules to `npm run lint` and probe each with a deliberate violation. Declare `AuthContextValue`, rename `hasResolved` to `hasVerifiedOnce`, and use React 19's `use()` and context-as-provider while in the file. `ApplicationPage` reads `auth.actionPending` instead of its own pending state.
4. **API client tidying.** `ApiError` takes an options object; the rate-limit deadline has one source (`retryAt`); the HTTP method is explicit; the error-code map is a module constant. `client.test.ts` must pass with only constructor-call changes.
5. **CSS.** Global element styles and color tokens move to `src/global.css`, keeping today's values; `theme-color` matches the page background; every button gets hover and pressed feedback with readable contrast.
6. **Review and gates.** An independent read-only review of the diff against E05, A11, Experience, and T20 (T16); then `npm run check`.
7. **Documentation.** CLAUDE.md's web section, AI.md, Verification (T20, T11 addendum), and this milestone's result. Push, pull request, and merge only when the user says so.

Exit evidence: T20 passes and T01–T19 still pass locally on M10's head. T13 on M10's code needs a pushed branch or pull request, which waits for the user's instruction.

### M10 decisions — 2026-10-22

**Needs your eyes** (the calls the user may want to overturn, with what reversing them costs):

1. **The toggle keeps its changing label and drops `aria-pressed`,** rather than a fixed `Show password` label with `aria-pressed`. Both satisfy the WAI-ARIA button pattern; this one keeps Experience's visible copy and matches common password-field practice. Reversal cost: low (one attribute, two assertions).
2. **Request errors use `role="alert"`,** rather than an always-mounted polite live region. An alert inserted into the page is announced reliably; a pre-mounted region would need every form to keep an empty container and manage its text. These errors follow an explicit submit, so an assertive announcement is not noisy. Reversal cost: low.
3. **The web layout is enforced in lint,** which the review proposed only as a convention. The constraint is mechanically checkable and the tool is already installed for the API, so two rules cost minutes and stop `ui/` from drifting back into transport code. Reversal cost: delete two rules.

Other decisions:

- **Not adopted, recorded in the Evolution register:** `zod/mini` (EV-WEB-05), route-level code splitting (EV-WEB-06), React Router's data mode (EV-WEB-07), Suspense for the session query (EV-WEB-08, rejected), the React Compiler or manual memoization (EV-WEB-09), a generic context interface or compound form components (EV-WEB-10), an accessibility lint plugin (EV-WEB-11), and splitting `App.test.tsx` by component (EV-TEST-05, rejected).
- **Guidelines not adopted because Experience owns them:** Title Case headings and buttons, example placeholders, and other copy rules from the web interface guidelines conflict with Experience's word-for-word copy. Trivial items (`touch-action`, `text-wrap: balance`, `translate="no"`, `spellCheck` on email) are not worth a change.
- **`ui/patterns.tsx` keeps its name.** Once the request-error code leaves, what remains (`Heading`, `Field`, `PasswordField`, `Notice`, `Alert`) is the shared presentational set its name describes; renaming would only add churn.
- **The rendering error boundary is unchanged.** Its `<h1>` is not the routed `Heading` on purpose: it must render without the router state that may have failed.

### M10 result — 2026-10-22

The user approved the v1.5 plan ("go-ahead"). The tasks ran in the documented order; exact commands and results are in Verification's M10 evidence.

1. **Accessibility fixes** (`5e697d9`). Test-first: the unit and browser assertions failed before the change and fail again when either fix is reverted in a rebuilt bundle. Axe in T11's eight states finds no violation. The VoiceOver spot check was **not performed** (below).
2. **Explicit forms and route guards** (`73c3222`, after `ba27424` moved the request-error code). `SignupForm` and `SigninForm` compose `AuthFormFrame` and share `useAuthForm`; the routes lost their `key` props; no existing assertion changed. A characterization test written first (a logout failure survives the session check after it) found the one structural trap, below.
3. **Layer tidying** (`ba27424`, `3e62c91`, `51305c3`). `ui/` holds only presentational components; two web rules in `npm run lint`, probed; `AuthContextValue`, `hasVerifiedOnce`, React 19's `use()`; `ApplicationPage` reads `auth.actionPending`.
4. **API client** (`c29a9a8`). Options object, one owner for the rate-limit wait, explicit methods. Two characterization tests came first; one closed a gap that let a mutation survive.
5. **CSS** (`efdfc80`). At rest, ten screenshots are byte-identical to the pre-M10 build; the new hover and pressed states contrast at least 6.29:1.
6. **Review and gates.** The independent review found no High finding and no behavior regression; its two Medium and five Low findings were reproduced and fixed (`51305c3`, `ec1c2ea`), except the background notices kept by decision. `npm run check` passed.
7. **Documentation.** CLAUDE.md's web section and lint line, README's and `docs/development.md`'s lint rows, Engineering E02/E05, Architecture A01's tooling row, Verification, AI.md. Nothing was pushed.

Decisions made during implementation (change log below):

- **`ApplicationPage` composes `RequireSession` inside itself** instead of being wrapped by it in `App.tsx`. Every auth action ends with a session check, and `RequireSession` withholds its content during checks; wrapped from outside, the page would unmount and lose a failed logout's message, which Experience requires to stay. The mutation that moves the guard outside fails the characterization test. E05 now states the rule.
- **`useAuthForm` holds the shared form policy.** A11's form configuration (validation modes, the single focus on the first invalid field) and the server field-error mapping were identical in both forms; the hook keeps one copy. Each form still calls `useForm` through it with its own schema and concrete types, so there is no union type or cast. E05 scopes it to these two forms.
- **Background session-check notices stay `role="status"`.** The review noted that `We couldn't check your session. Try again.` is inserted with its text, like the request errors that became alerts. It appears after background checks (focus, reconnect, navigation) while someone may be typing in a public form, and Experience asks for restrained announcements, so it stays polite; request-level errors, which follow the user's own submission, are the alerts. Reconsider with the screen-reader pass (EV-WEB-04).
- **The web layer rules are transitive** (from the review): a direct-import rule let a new top-level module carry `ui/` into `auth/`.
- **No VoiceOver check by the agent.** VoiceOver has never been configured on this machine, allowing its AppleScript control is a setting only the user can enable, and starting it unattended would take over the user's speech and keyboard. Chromium's accessibility tree shows what a screen reader receives (Verification M10 evidence). A manual check takes about two minutes: start VoiceOver (Command-F5), open `/signup`, activate `Show password` (expected: "Hide password, button", with no "pressed" or "selected"), then sign in with a wrong password on `/signin` (expected: "Email or password is incorrect." spoken without moving focus).

## Infrastructure maintenance — 2026-10-22

Requested by the user after M10's merge: a review of the infrastructure (Dockerfiles, Compose, the proxy, CI, the database scripts, and configuration) with the DevOps-delivery and engineering-judgment skills, then the proposal, approved with "go-ahead". A maintenance task on `ci/dependency-updates-and-schedule` (B03, T13); no milestone, because no requirement, route, image content, or Compose setting changes.

**Review result.** No correctness or security defect. Already in place: digest-pinned bases, a multi-stage build whose runtime has no npm and runs as `node`, exec-form startup so SIGTERM reaches Nest's shutdown hooks, `allowScripts`, loopback-only ports, health-gated startup, SHA-pinned actions with read-only permissions, and engine checks that fail `npm ci` when the Dockerfile's Node or `.nvmrc` drifts. `npm audit` reports 0 vulnerabilities, and `npm audit signatures` verifies 128 attestations.

Adopted:

1. **Dependabot version updates** (`.github/dependabot.yml`): monthly, one grouped pull request per ecosystem, with a seven-day cooldown, for the GitHub Actions and the three base images. `node` gets digest refreshes of the same tag only; `mongo` and nginx get patch releases only. npm stays manual.
2. **A weekly scheduled CI run** on `main` (Mondays 05:17 UTC), so drift in the runner or a registry shows up between pushes.
3. **The local Docker stack rebuilt** from `main` (`35bb9b9`); its `app` image predated M10.

Deferred, with register entries: image revision labels (EV-DEL-02), an image vulnerability scan in CI (EV-DEL-03), and container runtime hardening (EV-OPS-04).

Decisions made during the work:

- **Digest refreshes for `node` rest on Dependabot's source, not its documentation.** The documentation does not describe `tag@sha256` pins. In dependabot-core's Docker update checker, an ignored version leaves the current tag as the latest, and the digest of that tag is still compared, so a re-published `24.22.0-trixie-slim` produces a pull request. An experiment flag (`docker_digest_only_update_suppression`) can turn that off on GitHub's side; the first monthly run shows which applies. If it does, the Node image changes only with a deliberate Node upgrade, as before. The parser skips `FROM` lines without a tag or digest, so the stage references `FROM node AS npm` and `FROM node` are not treated as images.
- **No npm ecosystem.** A Dependabot bump of `argon2` or `@swc/core` would fail `npm ci` until its `allowScripts` entry changed, and the dependency tree would produce the most pull requests while the repository waits for review. `npm audit` stays the check.
- **nginx stays on 1.30, its stable branch.** Allowing minor updates would propose the odd-numbered mainline. Moving to the next stable branch is a manual change.
- **Records kept apart from the M10 merge record.** The pending merge record rewrites "Current handoff" and T13's row on `main`, so this branch adds its own sections and change-log row instead.
- **The schedule and Dependabot act only on the default branch.** The branch's CI run checks the edited workflow on every other trigger; the first scheduled run and the first Dependabot run can happen only after a merge to `main`.

## Command contract to implement

These are milestone-spanning command interfaces. M1 implements install, database setup, development, lint/typecheck/tests, builds, preview, and production startup. `check` and `test:e2e` are implemented at M3; `check:foundation` runs lint/typecheck/workspace tests/build without browsers. README lists actual available commands.

| Command | Expected behavior |
| --- | --- |
| `npm ci` | Install the locked workspace dependencies |
| `docker compose up -d` | Until M7: start the local MongoDB server with replica-set configuration. From M7 it starts the whole stack |
| `docker compose up -d mongodb` | From M7: start only the MongoDB service for the Node workflow and CI |
| `docker compose up --wait` | From M7: build missing images and run the whole application at `http://localhost:8080` without host Node (A12) |
| `npm run db:ready` | Initialize the known local/test replica set idempotently if needed and wait for a writable primary; never reconfigure a managed database |
| `npm run dev` | Build contracts initially, then watch contracts/API/web with correct startup order |
| `npm run lint` | Check code without modifying files; from M8 also the API dependency rules (Engineering E02) |
| `npm run typecheck` | Check all TypeScript workspaces |
| `npm run test` | Run schema/unit and API integration checks using isolated MongoDB |
| `npm run test:e2e` | Run focused Playwright browser tests with controlled server lifecycle |
| `npm run build` | Build contracts, API, and web in dependency order |
| `npm run preview` | Serve built web/API locally with explicitly documented development cookie settings |
| `npm run start:prod` | Run the built server with validated production configuration and web assets |
| `npm run check` | Run lint, typecheck, application tests, browser tests, and build; prerequisites documented |
| `npm run bench` | From M9: build, start the compiled API against an isolated database, and run T19's load matrix with rate limits enabled |

## Time and risk budget

Planning estimate revised with the explicit database setup: M1 45–75 minutes; M2 75–120; M3 60–90; M4 45–75; M5 25–40. Roughly **4–7 hours**, with tooling/debugging and submission availability potentially extending it. This is an estimate, not an achieved duration or a deadline promised by the brief. Record actual time if measured. M7 (v1.3) adds an estimated 2–4 hours: images and Compose, verification on two architectures, CI, and the README rewrite with its walkthrough. v1.4 adds an estimated 2–4 hours for M8 (rules, moves, ports, tests, review) and 2–4 hours for M9 (load command, baseline, hypothesis tests, and at most one or two measured changes).

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
| Argon2's native addon in the Linux image | Use Debian slim (glibc) so the published prebuilt binaries apply; add build tools to the build stage only if a prebuild is missing; never switch to musl or weaken hashing without evidence |
| Compose features differ by version (`network_mode: service:`, `service_completed_successfully`, `--wait`) | Verify against the installed Compose and CI's, then state the minimum version in README |
| Port 8080 already in use | `APP_PORT` moves the published port and `APP_ORIGIN` together |
| Shared network namespace surprises (ports declared on `mongodb`; recreating it recreates the others) | Comment it in `compose.yaml`; cover recreation in T17 |
| Docker Desktop on Windows is not available to verify | No shell entrypoints; verify macOS arm64 locally and Linux amd64 in CI; state Windows as unverified |
| The M8 restructure changes behavior unnoticed | Rules first, `git mv` for history, existing assertions untouched, mutation-checked new tests, full gate and independent review |
| Lint autofix turns a moved constructor dependency into `import type` and breaks injection | Explicit `@Inject(Token)` on every constructor dependency (CLAUDE.md); the real module graph runs in every integration suite |
| Benchmark load trips the rate limits or is read as capacity | Per-client `X-Forwarded-For` under loopback proxy trust, as the harness does; record environment; compare only runs from the same command and machine |
| An optimization quietly weakens a guarantee | Hashing admission and any read-policy change go through Architecture and the user's decision before code |

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
| 2026-10-21 | Replace MongoDB 8.0.32 with 7.0.45 (pinned by digest), under a new Compose volume name | CI run #6 failed `db:ready` because GitHub's new `ubuntu-24.04` image (20261018.339) runs kernel 7.0.0-1017-azure, and MongoDB 8.0 refuses to start on kernels 6.19 through 7.0.13 (SERVER-121912: its bundled TCMalloc breaks the kernel's rseq ABI). No 8.0.x release fixes it, there is no supported override, and Ubuntu's `7.0.0` kernel string stays blocked even where 8.0.30+ exempts 7.0.14 (SERVER-136848). MongoDB 7.0 predates that allocator and is supported until 2027-08-31. Rejected: keeping 8.0 on `ubuntu-22.04` runners (kernel 6.8), which fixes CI but not a reviewer on a current Linux kernel; MongoDB 8.2, a rapid release whose fix is unconfirmed. Volume `mongodb-data` becomes `mongodb-data-7.0`, because 7.0 cannot open files written by 8.0; nothing is deleted. A01/A08/A10 policy unchanged (majority/journal writes, linearizable session reads); B03/T12/T13 re-verified | Recorded before the change; implemented in `b136c59`; the gate passed against 7.0.45 locally and in a clean clone, and CI passed (Verification) |
| 2026-10-21 | Close M5 submission readiness | T01–T12, T14, T16 pass; T13 Pending only for the submitted public revision's run, T15 for the handoff. Repository description and recruiter text prepared, not applied or sent | Verified locally; stop after M5 |
| 2026-10-21 | Start authorized M6 from the clean `6b68db7` handoff; make `HossamElAnsary/easygenerator-auth` public and apply the description prepared in M5 | User authorized the visibility change, the description, and pushing M6 documentation after `npm run check`; sending the recruiter message was not authorized. R09/B03, T13/T15. Re-scan and the gate preceded publication; no code, configuration, scope, or other setting change | Public and verified logged out; T13 Pass (run #10 on `6b68db7`) |
| 2026-10-21 | Record M6 as **ready for handoff** | T15 waits for the user's instruction and recipient; the final recruiter message is prepared with the public URL and the submitted SHA, and is not sent. The record commit's own CI run is reported in the handoff message | Ready for handoff; not submitted |
| 2026-10-21 | Baseline v1.3: add B07, a Docker-only run (Architecture A12, check T17), and restructure README (R08, B05; T14). Insert M7 before the recruiter handoff | The user asked how someone without Node runs the project (today they cannot), and requested a Dockerfile per service, one Compose file that builds and runs everything, and a shorter README in the right order. Design: an `app` image (the API serving the compiled UI, per A02), a `proxy` image (A02's reverse proxy over HTTP), and a `mongodb` image with the init script copied in, sharing one network namespace, so the loopback listener, `TRUST_PROXY=127.0.0.1`, and the `localhost:27018` member stay unchanged. Rejected: an nginx-served SPA beside an API with `SERVE_WEB=false` (it duplicates the reviewed static-serving and CSP rules outside the browser suite, and production requires `SERVE_WEB=true`); configurable listen and replica-set hosts (they weaken A02/A07 and break host-side discovery). The Node workflow and CI change from `docker compose up -d` to `docker compose up -d mongodb`. T13, T14, and T16 are extended; T15 now follows M7, and the M6 recruiter text is superseded | Planning only; nothing implemented |
| 2026-10-21 | Start authorized M7 from `23a6e5d` | The user approved the v1.3 plan ("go-ahead"). Baseline gate passed before any edit; worked in the checkout because the session-start collision notice was stale. B07, R08, B05; T13, T14, T16, T17 | Implementation in progress |
| 2026-10-21 | Clarify A12 and T17 during M7: the documented command is `docker compose up --wait` instead of `up --build --wait`; images keep Compose's default `<project>-<service>` names, and `mongodb-init` builds its own copy of the MongoDB image; health checks drop `start_interval`; the proxy streams request bodies | On Docker Desktop's containerd store, the default provenance attestation gives each build a new image ID, so `--build` recreated every container and T17's "a repeated run changes nothing" could not hold; Compose 2.33 cannot disable the attestation. Registry-style names could be pulled from a namespace someone else controls, and the shared image name broke other project names. `start_interval` needs Engine 25+. Buffering made nginx read bodies before A07's controls ran. No route, response, cookie, schema, rate-limit, or database-policy change; T17's command wording updated with this entry | Implemented in `b595ee7` and `80446ee`; verified (Verification M7 evidence) |
| 2026-10-21 | Close M7 | T17 passes; T13 (run #13, both jobs), T14, and T16 pass on `f74212e`; T01–T12 still pass. The recruiter message is re-prepared, not sent | Verified; ready for handoff |
| 2026-10-21 | Baseline v1.4: add B08, enforced backend module boundaries (Engineering E02–E04 target design, T18, M8), and B09, measured backend performance (T19, M9). Narrow Requirements' exclusion from "load testing" to capacity or load certification. Work happens on the branch `refactor/m8-backend-structure` | The user began a backend optimization phase: asked for separation of concerns (repositories for data access, a business layer, controllers, configuration), a modular monolith, and missing ideas, and asked to compare their NestJS template. Review found the layers already exist under misleading names (`UsersService`/`SessionsService` are repositories), one reversed dependency (`database/startup-indexes.ts` imports both feature services), database wiring split across `CoreModule` and `AppModule`, mixed error ownership, repeated budgets, and no enforcement. Adopted from the template: `dependency-cruiser` rules, `index.ts` surfaces, abstract-class ports, vendor separation. Rejected: its pass-through repository wrapper, entity classes, global re-exporting modules, facades, interceptors for logging, and everything that conflicts with A01/A04/A09 or the exclusions. M9 measures first; hashing admission and any session read-policy change need Architecture updates, and the latter the user's decision. No route, response, cookie, schema, rate-limit, or database-policy change is planned in M8 | Planning only; nothing implemented; `main` unchanged |
| 2026-10-21 | Start authorized M8 on `refactor/m8-backend-structure`; add `dependency-cruiser` 18.7.0 | The user approved the v1.4 plan. Baseline gate passed on `23ad6e7` before any edit. B08, T16, T18 | Implementation in progress |
| 2026-10-21 | Clarify E02 during M8: `DatabaseModule` is global and registered once by the composition root; module index specifications live in `*.indexes.ts` and the composition root applies them; rule 4 also covers `mongodb` and `bson`, exempts only the users and sessions module files and the composition root, and every `index.ts` is barred from re-exporting an adapter or schema | `@nestjs/mongoose` 12.0.0's `forFeature()` builds model providers in a module without imports, so a non-global connection is unreachable (read in the installed source); the independent review found the driver packages, module files, and index re-exports outside the first rules. No route, response, cookie, schema, rate-limit, or database-policy change; Engineering E02 and the M8 tasks updated with this entry | Implemented and probed (Verification M8 evidence) |
| 2026-10-21 | Close M8 on the branch | T18 passes; `npm run check` passes (267 workspace and 10 Chromium tests). T13, T14, and T17 run again before M8 merges. Nothing pushed | Verified on the branch; M9 next |
| 2026-10-22 | Push `refactor/m8-backend-structure` and dispatch CI on it | The user asked to push the branch so CI runs on M8. The workflow runs on pushes to `main`, pull requests, and dispatch, so it was dispatched without opening a pull request. T13 | Run #15 passed both jobs on `8d4872e` |
| 2026-10-22 | Add the Evolution register (`docs/plan/evolution.md`) and Engineering E06's test-placement convention; fold the move of the two API unit tests into M9 step 1 | The user proposed moving unit tests into their modules, with a `tests/` folder once a module has two, then asked for the proposal to be challenged. Two of 14 API test files are unit tests; the other 12 start the whole application or check the toolchain and belong to no module. Verdict: the convention is right (beside the source, as in the web app, so the boundary rules also keep unit tests database-free), a standalone move is not worth a verification cycle, and the count threshold is rejected (EV-TEST-02). The user then asked for a register of improvements that would matter at scale, organized by layer and grown as ideas are challenged. It has stage definitions (S1 today to S4 product growth), statuses Deferred/Adopted/Rejected, and seed entries only from decisions already recorded (Architecture A05/A07–A10, Requirements' exclusions, README and M5 limitations, the M8 template comparison, and this challenge). AGENTS.md gains the rule that each deferral updates the register in the same change. No code, contract, or check change | Documentation only |
| 2026-10-22 | Start authorized M9 from `3b0e0da`; move the two API unit tests beside their sources; add `npm run bench` on `node:http` after removing `autocannon` 8.0.0 | The user said "go-ahead with M9". Baseline gate passed first. `autocannon` added a moderate `uuid` advisory (GHSA-w5hq-g745-h8pq) with only a breaking downgrade as fix, so it was replaced by a dependency-free closed-loop client. B09, T19; Engineering E06 | Implemented in `7d49a90` |
| 2026-10-22 | Do not implement hashing admission control; document `UV_THREADPOOL_SIZE` as per-deployment tuning; leave the linearizable session read unchanged and put its measured options to the user | Measured (Verification M9 evidence): hashing queues on the 4-thread pool at about 235 requests/s but other requests stay at 0.3 ms; 8 threads give about 440 requests/s, 16 about 560 with slower health checks; the linearizable read costs one journal commit interval (about 105 ms; 12.5 ms at a 10 ms interval). An admission limit would add a 503 contract path for an overload one process does not reach; a fixed pool size is machine-specific. A05–A07 and A10 unchanged; Evolution EV-PERF-01 (deferred), EV-PERF-02 (adopted as guidance), EV-DATA-01 (user's decision) | Recorded with the measurements |
| 2026-10-22 | Apply the independent M9 review: the benchmark's own-database guard, a live session for the read probe, flagged non-success rows, shutdown timing, and documentation that no longer overclaims | One medium finding (an unmatched test URI could have written to and dropped the marker test database) and four low ones. Benchmark and documentation only; T16, T19 | Fixed in `4e39cfc`; recorded baseline re-run on `36cddc5` |
| 2026-10-22 | Close M9 on the branch | T19 passes; `npm run check` passes. Nothing pushed; the session read decision is the user's | Verified on the branch |
| 2026-10-22 | Keep linearizable session reads (option 1 of EV-DATA-01); push the branch and dispatch CI on M9 | The user chose option 1 after the measured options and asked to push so CI runs. A10 unchanged; the register entry becomes Deferred with its trigger. T13 | Run #16 passed both jobs on `08666d5` |
| 2026-10-22 | Run the merge-readiness checks and open a pull request to `main` | The user asked for the three remaining steps: T14 and T17 from a clean clone (both passed again at `664da83`), then a pull request so CI runs on the merged head. No code or contract change; CLAUDE.md gains a note on the Compose namespace pitfall the walkthrough hit. Merging is not authorized yet | Pull request open; its CI run is reported in the handoff message |
| 2026-10-22 | Merge M8 and M9 into `main` | The user merged pull request #1 (`2ebef0e`); pull-request run #17 passed both jobs on the merged head `75119ee` (check job 2 min 5 s, Docker-only job 51 s); the user merged pull request #1 as merge commit `2ebef0e`, whose tree equals `75119ee`, and push run #18 on `main` passed both jobs (check job 1 min 50 s, Docker-only job 54 s). The recruiter message is re-prepared with the head after this record commit; nothing was sent. T13, T15 | Merged; ready for handoff |
| 2026-10-22 | Baseline v1.5: add B10, a maintainable frontend structure with two accessibility fixes (Engineering E05's v1.5 layout, T20, M10); record push run #19 on `63149e4` under T13. Work happens on the branch `refactor/m10-frontend-structure` | The user asked for a frontend review with four review skills and approved the proposed plan. Findings: the password toggle changes its label and its pressed state together; request errors are inserted with `role="status"`, which screen readers announce unreliably (no screen-reader pass exists, T11); one signup/signin form branches on a mode flag in 14 places, forcing union types, a cast, an impossible-state branch, and `key` props on the routes; route guards inside pages; `ui/` importing transport errors; an implicit context type; positional `ApiError` arguments with a duplicated rate-limit deadline; global styles inside a CSS Module. Measured and rejected as performance work: the bundle (131 KB gzip; application code 2.6%) and re-renders (about five small consumers). Adopted from the skills: explicit variants, children over flags, an explicit context contract, React 19's `use()`. Deferred or rejected: EV-WEB-05 to EV-WEB-11 and EV-TEST-05. No route, visible copy, API, session-state, cache, or credential-handling change is planned; the only visual change is button hover and pressed feedback | Planning only; nothing implemented; `main` unchanged |
| 2026-10-22 | Start authorized M10 on `refactor/m10-frontend-structure` | The user approved the v1.5 plan ("go-ahead"). Baseline gate passed on `63149e4` before any edit (73/154/40 workspace tests, 10 Chromium cases). B10, T11, T16, T20 | Implementation in progress |
| 2026-10-22 | Clarify E05 during M10: a page whose state must survive the session check after an auth action composes `RequireSession` around its content instead of being wrapped by it; the two forms share `useAuthForm`; the web layer rules forbid reaching a layer through any module, not only direct imports, and production code may not import the web test setup; background session-check notices stay `role="status"` | A characterization test showed that wrapping `ApplicationPage` from outside drops a failed logout's message during the check that follows it (Experience). The form policy was duplicated verbatim. The independent review showed a top-level module could carry `ui/` into `auth/` past direct rules, and that the session notice is inserted with its text; it stays polite because it follows background checks while someone may be typing. No route, copy, API, session-state, or cache change; Engineering E05 and T20's evidence updated with this entry | Implemented and probed (Verification M10 evidence) |
| 2026-10-22 | Close M10 on the branch | T20 passes; `npm run check` passes on `ec1c2ea` (73/154/48 workspace tests, 10 Chromium cases); T11 and T16 gained M10 evidence. The VoiceOver spot check was not run (it needs a setting only the user can enable) and is left as an optional manual step. Nothing pushed | Verified on the branch |
| 2026-10-22 | Push `refactor/m10-frontend-structure`, dispatch CI, and open pull request #2 to `main` | The user asked to push, run CI, and open a pull request. T13. No code or contract change; merging is not authorized | Runs #20 (dispatch) and #21 (pull request) passed both jobs on `f018e9c`; pull request open |
| 2026-10-22 | Infrastructure review: add Dependabot version updates for GitHub Actions and the three base images, and a weekly scheduled CI run; defer image revision labels (EV-DEL-02), an image vulnerability scan in CI (EV-DEL-03), and container runtime hardening (EV-OPS-04) | The user asked for a review of the infrastructure with the DevOps and engineering-judgment skills and approved the proposal ("go-ahead"). It found no correctness or security defect. Every version is pinned, but nothing proposes updates, so base-image patches arrive only when someone remembers; and CI runs only on push, pull request, or dispatch, so runner drift (the cause of run #6) goes unnoticed while the repository waits for review. npm stays manual: `allowScripts` names exact versions, so a native-package bump needs a hand edit. B03, T13; Architecture A01's pin policy, `docs/development.md`, CLAUDE.md. No application, route, image content, or Compose change. Work on `ci/dependency-updates-and-schedule` | Implemented on the branch; `npm run check` passed, and CI run #24 passed both jobs on `306ee8c`. The schedule and Dependabot start only after a merge to `main` |

Future entries should include the decision changed, rationale, affected requirement/check IDs, and validation impact. Do not overwrite history to conceal a scope reduction.
