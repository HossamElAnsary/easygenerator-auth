# AI Assistance Record

Status as of **2026-10-20**: planning and M1 foundation implementation. Authentication and the browser journey have not been implemented; detailed local evidence and Pending checks are recorded in Verification.

## Assistance so far

| Area | AI involvement | Verification or human input |
| --- | --- | --- |
| Brief conversion | Extracted the supplied two-page PDF and formatted it as Markdown | Compared the extracted words with the Markdown; all 516 words were preserved in order |
| Requirement interpretation | Explained required behavior, optional bonuses, and engineering choices | Checked the explanation against the complete brief |
| Planning | Drafted scope, architecture, UX behavior, milestones, acceptance checks, and change control | User selected React with TypeScript and a clean, minimal, professional interface |
| Independent reviews | Separate AI reviews examined architecture/security, UX, and requirement/acceptance coverage | Findings were reconciled into one consistent plan |
| Technical references | Consulted official runtime/framework/database and security guidance to inform the plan; checked actual npm engines/peers and generated Nest ESM defaults at M1 | References appear beside decisions; M1 install/build/test evidence now verifies the selected foundation packages |
| Agent guidance | Drafted root AGENTS.md from the existing planning baseline and linked it from PLAN.md | User proposed durable project instructions; detailed requirements and progress remain in their original documents |
| Engineering decisions | Defined practical OOP/SOLID responsibilities, implementation dependencies, authentication alternatives, route access policy, and MongoDB ACID/consistency boundaries | User requested explicit decisions before coding; consulted primary Nest/React/MongoDB/OWASP/IETF sources and independent planning reviews |
| Frontend package planning | Revised baseline to React Hook Form + Zod resolver and TanStack Query over fetch; documented state ownership, auth cache behavior, React practices, and acceptance cases | User proposed the packages; consulted official React, resolver, and Query documentation; updated planning documents only, without installing packages |

## Prompts and approaches that were useful

These describe the actual requests and working approach, rather than reproducing every conversation message.

- Convert the supplied PDF into Markdown while preserving the content and structure.
- Explain the assignment before implementing it.
- Plan the complete solution first and keep an organized, documented source of truth to detect divergence.
- Review requirements separately from chosen security controls and optional scope.
- Ask independent reviewers to identify ambiguity, failure states, and acceptance gaps, then resolve differences in the main plan.
- Check official documentation before choosing runtime and framework assumptions; record intended behavior before producing code.
- Turn the existing goal, requirements, architecture, and execution agreements into concise repository guidance; consult [official OpenAI AGENTS.md guidance](https://learn.chatgpt.com/docs/agent-configuration/agents-md) for its role.

## Corrections and decisions made during planning

- Treated logout as optional in the brief and explicitly selected it for this solution.
- Separated “ready to submit” from completed public-repository publication and recruiter handoff.
- Selected server-managed sessions without introducing refresh-token or device-management features.
- Specified that a session-check network failure is a service-unavailable state, not proof that the user is signed out.
- Made password character definitions explicit so international letters and whitespace are not accidentally classified as special characters.
- Distinguished expired-session rejection from MongoDB TTL cleanup; authentication must reject expiry immediately.
- Clarified that a globally installed throttling guard can still apply limits per route; the plan does not claim an aggregate IP limit that has not been implemented.
- Corrected the proposed session-check cookie cleanup: a delayed 401 must not erase a cookie from a newer signin, so `/auth/me` never changes cookies.
- Required background session checks to preserve unfinished public forms, and separated pending remote CI results from the local release-preparation gate.
- Clarified that opaque/JWT format, cookie transport, credential renewal, and role policy are separate decisions; kept the existing session choice and defined authorization without inventing roles.
- Corrected implementation ordering: actual user/session indexes follow their schemas; the frontend API client/auth state precede the forms that depend on them.
- Defined OOP/SOLID through provider responsibilities and review checks, with functional React components and no forced inheritance or generic repository framework.
- Distinguished individual atomic writes from whole-request transactions and documented uncertain acknowledgment. Selected one-node replica-set development/CI to verify the chosen database concerns; no failover or production validation is claimed.
- Replaced planned manual form/request bookkeeping with React Hook Form and TanStack Query while retaining shared Zod validation and native fetch. Defined a single owner for each state category and kept authentication status derived from server-query results.
- Accounted for retained mutation variables: credential submissions remain awaited coordinator actions with form-local pending state, while credential-free logout uses a mutation. Explicit auth query options address retries/offline behavior; cancellation and cache cleanup preserve the existing session-race contract.

These are planning decisions and corrections, not claims about defects found in generated application code.

## Implementation record

| Date / milestone | AI-assisted files or behavior | Effective prompt or approach | What was corrected, reworked, or independently chosen | Actual validation evidence |
| --- | --- | --- | --- | --- |
| 2026-10-20 / M1 tooling | Root workspace, exact manifests/lockfile, strict TypeScript, ESLint/Hooks, Prettier, runtime pins, ignored artifacts, Git initialization, README | Follow the requested M1 order; query actual registry engine/peer metadata and inspect an official generated ESM scaffold before feature code | Selected TS 6.0.3 because TypeScript 7 did not satisfy TypeScript ESLint's peer range. Used Node 24.22.0/npm 12.2.0 from a temporary tool directory instead of changing global tools. npm 12 blocked dependency install scripts by default; added exact-version permissions for SWC/Argon2 and left optional fsevents install disabled | Locked `npm ci --no-audit --no-fund`, `npm ls --depth=0`, strict typecheck, production builds, Nest DI/validation and native Argon2 smoke; see T01 evidence |
| 2026-10-20 / M1 browser/contracts | Strict shared health schema, React/Router/Query readiness screen, CSS Modules, relative fetch/proxy, RHF/resolver package-integration fixture | Keep the screen truthful and use a test-only form to prove package integration without starting signup/signin | Shared package exports point to built ESM; both consumers compile against the package. The form fixture keeps input local and awaits submission; no auth schema, session coordinator, or credential cache was added | 6 contracts tests and 4 web tests pass; web tests use jsdom/mocked requests, not a real browser/backend |
| 2026-10-20 / M1 database/API | Validated runtime config, explicit Nest/Mongoose connection provider, bounded concern policy, readiness health, awaited startup index hook, safe startup failure, built static routing, Compose initializer and isolated tests | Prove real replica-set behavior and failure handling before authentication; keep startup sequencing explicit | Avoided the existing port 27017 service by using 27018. Corrected pinned-driver command timeout usage to `timeoutMS` (query reads retain `maxTimeMS`), Mongo shell `getCmdLineOpts` field spelling (`replSet`), explicit shell port, and thrown NotYetInitialized classification. Kept only error codes when classifying shell errors. Initialization targets only the project container and never reconfigures a set. Index definitions remain M2 | 31 API tests pass, including 4 real DB integration cases. Live development proxy, compiled preview, Mongo outage 503/recovery, repeated setup/config version 1, unsafe config/unavailable DB/missing asset failure checks recorded under T12 |
| 2026-10-20 / M1 review and evidence | Delivery, Verification, Architecture, PLAN, AI.md, README | Separate M1 evidence from whole-project completion; review scope independently before editing | Initial API smoke was blocked by sandbox loopback permissions, then passed with the authorized network-capable execution. Initial DB smoke failed until initializer fixes above; failures were not counted as passes. Independent review and scoped scaffold assistance were used; main session completed the database/runtime implementation | T12 stays Pending overall; no user/session index, authentication, browser journey, remote CI, publication, or recruiter handoff claim |
| 2026-10-20 / M1 handoff | Delivery, Verification, AI.md | User requested updated progress/evidence and a concise handoff; inspect the committed workspace before summarizing | Bound prior evidence to implementation commit `7a16842`; made remaining work, retained decisions, runtime prerequisites, and M2's first schema task explicit. Kept documentation review separate from application execution | Git/source/script review confirmed M1-only scope and no remote. No application suite or live-service check rerun; T01 remains Pass and T02–T16 remain Pending |
| 2026-10-20 / post-M1 agent guidance | Root CLAUDE.md for Claude Code, Delivery change log, AI.md | Claude Code /init: survey manifests, configs, source, tests, and planning documents, then check each documented command and convention against the installed tools before recording it | Imported AGENTS.md instead of copying it, because by default the installed Claude Code loads AGENTS.md only when a project has no CLAUDE.md. Recorded conventions the code implied but no document stated: explicit Nest `@Inject` tokens (the lint autofix to `import type` would otherwise leave `Object` in decorator metadata), contracts consumed from built `dist`, API tests run through the npm script that loads `.env`, and English-only copy | Single-file and name-filtered Vitest runs passed in each workspace; an ESLint stdin probe and a TypeScript transpile confirmed the import-type/metadata effect; `npm run check:foundation` passed before and after the change (lint/format, typecheck, 41 tests, builds) on Node 24.22.0/npm 12.2.0 from a temporary tool directory. No acceptance status changed |

Continue appending actual milestone work and corrections. M1 has not exercised deployed HTTPS, multi-node failover, production authentication, accessibility journeys, or remote CI. No elapsed delivery-time claim or security certification is made.
