# Authentication Application Plan

Baseline: **v1.3 — 2026-10-21** (v1.2 of 2026-10-20 plus B07, a Docker-only run, and a restructured README)

Status: **M1 foundation, M2 authentication API, M3 browser journey, M4 quality and CI, and M5 submission readiness are complete, with evidence recorded in Delivery and Verification. M6 made the GitHub repository public and verified it, and CI passes on the published revision. Baseline v1.3 adds M7, a Docker-only run and a shorter README, before the recruiter handoff; M7 is planned, and the project is not submitted.**

## Objective

Deliver a small, secure, maintainable authentication application that satisfies the Full Stack Test Task: signup, signin, an authenticated application page, a protected backend endpoint, and a reproducible, documented repository. Demonstrate thoughtful AI-assisted work and keep the implementation focused enough for the assignment's few-hour delivery expectation.

The user confirmed **React with TypeScript** and a **clean, minimal, professional interface**. Other technical selections below are documented engineering decisions, not additional requirements from the brief.

## Read this plan in order

Agent working instructions live in [AGENTS.md](AGENTS.md). This plan and its linked documents own the specification, milestone tracking, and acceptance evidence.

| Document | Owns |
| --- | --- |
| [Requirements](docs/plan/requirements.md) | Required scope, selected bonuses, non-goals, and requirement IDs |
| [Architecture](docs/plan/architecture.md) | Stack decisions, data model, validation, API, security, and runtime configuration |
| [Engineering standards](docs/plan/engineering.md) | Clean code, OOP/SOLID responsibilities, service boundaries, and review criteria |
| [Experience](docs/plan/experience.md) | Screens, navigation, session states, form behavior, accessibility, and visual direction |
| [Delivery](docs/plan/delivery.md) | Ordered work, dependencies, milestone status, risks, and change history |
| [Verification](docs/plan/verification.md) | Acceptance checks, evidence, and release criteria |
| [AI assistance record](AI.md) | Actual AI involvement and engineering corrections, updated during the work |

## Source of truth and change control

1. Explicit user decisions govern project choices. The supplied task brief governs assignment requirements unless the user deliberately changes the objective.
2. The original PDF and its Markdown conversion are the source material. The requirements document maps their obligations into stable IDs. Source copies remain local reference material; the deliverable repository does not need to republish the original brief.
3. This index and the linked planning documents form the implementation baseline. Each document owns the subject listed above; other documents refer to it instead of redefining it. AGENTS.md directs agents to this baseline and summarizes durable working agreements.
4. Milestone progress belongs in Delivery. Verification results belong in Verification. Planned behavior is never evidence of completed behavior.
5. Before changing scope, a contract, or an architecture decision, record the reason, affected requirement/check IDs, and tradeoff in the Delivery change log; update the owning document and affected checks together. Ordinary implementation details that preserve the contract do not need a new decision.
6. A requirement becomes verified only when its acceptance evidence exists. Failed, blocked, or unrun checks remain visible. A time estimate is not permission to omit a required feature or silently weaken a selected security control.

## Baseline decisions

| Area | Selection | Basis |
| --- | --- | --- |
| Frontend | React, TypeScript, Vite, React Router; simple CSS Modules | User preference and small application scope |
| Forms and server state | React Hook Form + Zod resolver; TanStack Query over native fetch | Clear ownership of form values, validation, session queries, and request state; Architecture A11 |
| Backend and database | NestJS, MongoDB, Mongoose | NestJS and MongoDB are required; Mongoose is our choice |
| Repository | npm workspaces: web, API, shared contracts | One install and lockfile; shared validation rules |
| Authentication | Opaque server-managed sessions in MongoDB; HttpOnly cookie; fixed 24-hour expiry | Straightforward persistence, expiry, and revocation |
| JWT / refresh tokens | Neither a JWT nor an access/refresh pair | The selected session model has no renewal endpoint; expiry requires signin |
| Authorization | Authentication required by default for API handlers; own-profile access; no RBAC | No distinct business roles or privileged operations in the brief |
| Data consistency | Atomic document writes, explicit read/write concerns, no multi-document transaction | Each current mutation changes one document; session reads honor confirmed revocation |
| Database setup | One-node replica set locally/in CI; external replica set for production | Exercise selected concern settings without claiming local redundancy/failover coverage |
| Code structure | Focused Nest providers with composition/DI; functional React components/hooks | Apply SOLID through concrete responsibility and dependency boundaries |
| Signup completion | Redirect to signin; no automatic session | Makes the two required flows explicit |
| Protected resource | `GET /api/auth/me` | Supplies authenticated user data and enforces backend access |
| Selected extras | Logout, focused tests, basic CI, safe logs, Markdown API documentation, Docker-only run (v1.3) | Useful evidence of quality without a larger product; the Docker run was the user's request |
| Docker-only run | `docker compose up --build` runs MongoDB, the API serving the compiled UI, and a front proxy, with no host Node; a loopback preview, not a deployment | User request (v1.3); Architecture A12 keeps the loopback, proxy-trust, and replica-set contracts unchanged |
| Delivery topology | Same-origin browser UI and `/api`; one API process; MongoDB | Keeps cookie and origin behavior explicit |
| Submission | Public GitHub code repository and recruiter handoff | Required final outcome; outside the current M1 scope |

Detailed values and behavior are defined in Architecture and Experience.

## Completion means

- Every required item in Requirements has passing evidence in Verification.
- The complete signup → signin → welcome → logout journey works, including direct access, refresh, expiry, invalid credentials, and recoverable errors.
- The server enforces validation and authorization independently of the browser; stored credentials and returned data follow the security contract.
- A clean checkout can be configured, run, checked, and built using the README; from v1.3, someone with only Docker can run the whole application from it.
- README and AI.md describe the actual implementation and its limitations; selected CI checks pass for the submitted revision.
- The public repository is verified and its link has actually been handed to the recruiter when submission is performed. “Ready to submit” and “submitted” are distinct states.

M1 establishes the executable foundation, M2 the authentication API, M3 the browser journey, and M4 the accessibility, production-configuration, and security reviews plus the CI workflow, verified with direct API/Mongo tests, Chromium, and local workflow replays. M5 followed the README from a clean clone, fixed what that walkthrough and an independent review found, and reconciled every requirement with its evidence. M6 made the repository public, verified it from a logged-out view, and confirmed the published revision's passing CI run; the recruiter handoff waits for the user's instruction. Production certification and submission are not claimed. See Verification for the exact completed and Pending checks.

## Planning exit review

- [x] Read the complete supplied brief.
- [x] Confirm framework preference and visual direction with the user.
- [x] Separate required features, chosen engineering controls, selected bonuses, and non-goals.
- [x] Define API, data, session, validation, and UI behavior before coding.
- [x] Define work order, measurable acceptance checks, evidence tracking, and change control.
- [x] Review the documents for coverage and consistency.

Planning created no application files, dependencies, services, Git repository, or deployment. The authorized M1–M5 work established the local foundation, authentication API, browser journey, quality/CI gate, and submission readiness; the authorized part of **M6: Submission** made the repository public. The user then added **M7: Docker-only run and README** (baseline v1.3), which precedes the recruiter handoff; the handoff needs the user's explicit instruction. The baseline is v1.3, with the M2 contract clarifications and the M4 configuration clarifications recorded in Delivery's change log; exact tooling pins and local setup decisions are recorded in Delivery and README.
