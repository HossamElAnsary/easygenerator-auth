# Project Instructions

This file guides agents working anywhere in this repository. It summarizes the goal and working agreements; detailed product and technical contracts remain in the linked planning documents.

## Goal and business requirements

Deliver the Full Stack Test Task as a focused, secure, maintainable authentication application. A visitor can create an account, sign in, and access an authenticated welcome page. The backend protects authenticated resources independently of browser navigation.

The assignment requires:

- Signup with email, name, and password, including the brief's field validation on the frontend and backend.
- Signin with email and password.
- An application page displaying exactly `Welcome to the application.`
- A TypeScript frontend using React or Vue, a NestJS backend with MongoDB, and at least one protected endpoint.
- A reproducible README, a substantive and truthful AI.md, and eventual public GitHub submission with recruiter link handoff.
- Secure, clean, modular code and efficient delivery, with engineering judgment applied to AI output.

The user selected **React with TypeScript** and a **clean, minimal, professional interface**. The plan additionally selects logout, focused tests, basic CI, safe logs, and Markdown API documentation. Preserve the distinction between assignment requirements and these selected extras. See [Requirements](docs/plan/requirements.md) for stable requirement IDs, exact acceptance boundaries, and exclusions.

## Read before working

1. Read [PLAN.md](PLAN.md) and the current milestone/status in [Delivery](docs/plan/delivery.md).
2. Inspect the actual workspace and, when available, Git status. Planned directories, dependencies, scripts, and features may not exist yet. Preserve unrelated user changes.
3. Read the owning documents for the requested work:

| Document | Authority |
| --- | --- |
| [Requirements](docs/plan/requirements.md) | Required scope, selected extras, non-goals, requirement IDs |
| [Architecture](docs/plan/architecture.md) | Versions/tooling policy, data, validation, API, session/security rules, configuration |
| [Engineering](docs/plan/engineering.md) | Concrete OOP/SOLID commitments, module/provider responsibilities, review criteria |
| [Experience](docs/plan/experience.md) | Routes, screen states, forms, redirects, visual and accessibility behavior |
| [Delivery](docs/plan/delivery.md) | Work order, milestone progress, planned commands, risks, change history |
| [Verification](docs/plan/verification.md) | Acceptance checks, evidence ledger, completion gates |
| [Evolution register](docs/plan/evolution.md) | Improvements weighed and deferred or rejected, by layer, with their scale stage and trigger |
| [AI.md](AI.md) | Actual AI involvement, effective approaches, corrections, decisions, validation |

Follow the user's current request and existing authorization to determine the phase. Planning requests produce planning artifacts. When implementation is requested, continue from the appropriate unfinished milestone and proceed through the authorized scope without requesting permission for routine steps.

Current user instructions govern project choices; the brief defines assignment obligations unless the user deliberately changes the objective. This file guides execution of the baseline. Resolve any material conflict using documented decisions and raise unresolved conflicts with the user while continuing independent work. Original brief copies are local reference material; a public checkout can rely on the documented requirements.

## How the planned project works

The repository uses npm workspaces with one lockfile:

| Planned location | Responsibility |
| --- | --- |
| `apps/web` | React/Vite UI, routing, forms, authentication state, API client, CSS Modules |
| `apps/api` | NestJS controllers/services/guards, MongoDB through Mongoose, users and sessions; from v1.4 a modular monolith with enforced boundaries (Engineering E02) |
| `packages/contracts` | Shared Zod input schemas, public types, validation constants |
| `tests/e2e` | Focused browser journeys |
| `docker/`, `compose.yaml` | From v1.3: Dockerfiles for the MongoDB, application, and proxy images, and one Compose file that runs the whole application without host Node (Architecture A12) |

The browser uses one origin and relative `/api` requests. Signup creates an account and then navigates to signin. Successful signin establishes an opaque server-managed session through an HttpOnly cookie. The server stores a hash of the session token in MongoDB, resolves the authenticated user on protected requests, and revokes the presented session on logout. The browser restores identity through the protected session-check endpoint before displaying the application.

Architecture owns exact routes, response shapes, hashing parameters, cookie attributes, expiry, rate limits, versions, and environment settings. Experience owns the UI's interpretation of those results. Update these owners if a deliberate design change is made.

Frontend state follows Architecture A11: React Hook Form owns form values, shared Zod schemas own validation, TanStack Query owns server data, and native fetch owns transport. The auth coordinator derives session state without a second user store. Credential submissions must not retain passwords in shared query/mutation caches.

The baseline deliberately uses no JWT, refresh-token flow, or RBAC; authorization still restricts resources to their session owner. Architecture A09 explains these decisions and A10 defines ACID boundaries and the replica-set read/write policy. Follow those contracts rather than choosing authentication or transaction patterns implicitly from a template.

## Implementation and review rules

- Keep changes tied to requirement/check IDs or an explicitly requested documentation/maintenance task. Respect the documented non-goals; avoid unrelated features, infrastructure, and speculative abstractions.
- Apply Engineering's responsibility map and SOLID review criteria: keep TypeScript strict, controllers thin, services focused, and UI components small; prefer composition. Shared contracts must not depend on either application.
- Use shared schemas for input validation and enforce them on the server. Browser checks and route guards are usability measures; server authorization remains mandatory.
- Preserve password input exactly and use the planned password-hashing mechanism. Return only the explicit public-user representation; keep credentials and session material out of JSON responses, browser storage, URLs, and logs.
- Enforce expiry during session lookup; MongoDB TTL is cleanup. Use a unique database index for normalized email and handle concurrent conflicts.
- Preserve the specified origin/header/content-type controls, cookie security, safe errors, and request limits. Do not weaken them to make a demo or test pass.
- Keep session checks read-only with respect to cookies. Ignore stale auth responses, preserve unfinished forms during background checks, and distinguish unavailable service from unauthenticated state.
- Use isolated test databases and restrict cleanup to data owned by that test run. Keep secrets, actual environment files, database data, generated artifacts, and local brief copies out of the public repository.

## Work and verification loop

1. Identify the relevant milestone, requirement IDs, acceptance checks, and existing implementation before editing.
2. Make the smallest complete change that satisfies the behavior. Add meaningful tests for validation, authentication, persistence, or state risks; avoid tests that merely mirror implementation or low-impact styling.
3. Run the appropriate available checks. Planned commands are in Delivery; once implemented, verify scripts in `package.json` and instructions in README before using them. Do not report a planned command as executed.
4. Record actual results in Verification and milestone progress in Delivery. A partial check stays Pending until all its criteria pass; distinguish local results from remote CI and submission.
5. Update AI.md with actual assistance and useful corrections/decisions, plus relevant README or contract changes. Report what changed, what was verified, and any remaining issue.

When an improvement is challenged and deferred or rejected, add or update its Evolution register entry in the same change as its Delivery change-log row; never add an entry nobody has weighed. Record material scope, contract, architecture, or selected-extra changes in Delivery's change log before dependent implementation. Update the owning document and affected checks together; preserve stable IDs. Routine implementation decisions within the baseline need no additional approval. Do not silently rewrite acceptance criteria to fit incomplete code.

Before publication or other external actions, use the user's existing authorization and complete the local preparation. Request only genuinely missing permission or destination details. Recruiter communication requires explicit instruction to send it.

## Definition of done and maintenance

A feature is complete when its documented behavior and relevant checks pass with recorded evidence. The project is complete when the release/submission gates in Verification are satisfied, including accurate README/AI.md and the required public-repository handoff. Files existing, a working happy path, or a locally passing suite alone do not establish project completion.

Keep this file concise and durable. Store changing progress in Delivery, test results in Verification, and detailed contracts in their existing owners. Update this summary when those decisions change. Add nested AGENTS.md files only when a directory develops genuinely distinct working rules.
