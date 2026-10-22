# Requirements and Scope

Return to [PLAN.md](../../PLAN.md). Requirement IDs stay stable if the plan changes. Test IDs refer to [Verification](verification.md).

## Assignment requirements

| ID | Requirement | Acceptance boundary | Evidence checks |
| --- | --- | --- | --- |
| R01 | React or Vue frontend using TypeScript | React is selected; application source is typed and the web build succeeds | T01, T12 |
| R02 | Signup form with email, name, password and the stated validation | Valid email; name at least 3 characters; password at least 8 characters with a letter, a number, and a special character | T02, T03, T09 |
| R03 | Signin form with email and password | Existing account can authenticate; invalid credentials fail safely | T05, T09 |
| R04 | Application page with the exact welcome message | Visible text is `Welcome to the application.` including the final period | T09 |
| R05 | NestJS backend integrated with MongoDB | Real NestJS API persists accounts and sessions in MongoDB | T01, T02, T06, T12 |
| R06 | Signup and signin endpoints, with backend field validation | Direct API requests cannot bypass the applicable input rules | T02, T03, T05, T08 |
| R07 | At least one protected endpoint | `/api/auth/me` requires a valid, unexpired server-side session | T06 |
| R08 | README with basic repository instructions | A clean checkout can be configured, run, tested, and built from the instructions | T12, T14 |
| R09 | Public GitHub repository and recruiter link handoff | Public submitted revision exists and the link is actually shared | T15 |
| R10 | Mandatory AI.md with substantive AI-use documentation | Identifies assisted areas, useful prompts/approaches, corrections/rework, and engineering decisions; no invented claims | T14 |
| R11 | Production readiness, security, maintainability, clean modular code | Meets the bounded engineering baseline in Architecture and passes focused review | T04–T08, T12, T16 |

The brief also evaluates **delivery speed** and **judgment when using AI**. It expects work on the scale of a few hours but provides no fixed deadline, minimum coverage percentage, hosting requirement, or prescribed authentication mechanism. Validation character definitions and upper bounds are resolved as explicit choices in Architecture.

## Selected optional features

These are optional in the brief but included in this baseline. Removing one requires a documented scope change.

| ID | Selection | Deliberate limit | Checks |
| --- | --- | --- | --- |
| B01 | Logout button and server-side session revocation | Current browser session only | T06, T09, T10 |
| B02 | Automated tests | Validation/security boundaries and essential user journeys; no coverage-percentage target | T02–T10 |
| B03 | Basic CI | Install, lint, typecheck, test, and production build on push/PR; no automatic deployment | T13 |
| B04 | Operational logs | Request IDs and safe error/event metadata; no external telemetry platform | T08, T16 |
| B05 | API documentation | Routes, schemas, errors, cookie/origin requirements, and examples in Markdown | T14 |
| B06 | Consistent error handling | Field, authentication, rate-limit, dependency, and unexpected-error responses plus UI recovery | T03, T05, T08, T10 |
| B07 | Docker-only run (added in v1.3 at the user's request) | One `docker compose up` builds and starts the whole application (MongoDB, the API serving the compiled UI, and a front proxy) on a machine with Docker and no host Node. A loopback HTTP preview only: no registry publishing, HTTPS, or deployment | T17 |
| B08 | Enforced backend module boundaries (added in v1.4 at the user's request) | The API follows Engineering E02's layout, repository ports, and dependency rules, and the gate fails when a rule is broken. A behavior-preserving restructure: no route, response, cookie, schema, rate-limit, or database-policy change | T16, T18 |
| B09 | Measured backend performance (added in v1.4 at the user's request) | A repeatable local load baseline for the four auth endpoints, and only those optimizations the measurements justify, each measured before and after. A single-machine, single-node baseline, not capacity certification; a change that weakens a security or consistency guarantee needs the user's decision and an Architecture update first | T19 |

Although the brief lists error handling as a bonus, safe treatment of ordinary invalid input and failed authentication is part of our chosen working baseline.

## Engineering choices necessary to make the brief concrete

The brief does not specify the following. Their exact behavior is owned by Architecture and Experience:

- Session storage, expiry, cookie attributes, CSRF defense, and logout revocation.
- Signup completion, route redirects, session restoration, and service-unavailable behavior.
- Email normalization and uniqueness; whitespace, Unicode character counting, and input size limits.
- Password hashing, generic signin errors, throttling, redaction, and safe response shapes.
- Local setup, production build topology, test database isolation, and package version pinning.

Architecture A09 explicitly selects opaque cookie sessions without JWT, refresh tokens, or RBAC; it still requires server-side own-profile access control. A10 defines the ACID/transaction boundaries and database concern policy. [Engineering](engineering.md) defines concrete clean-code/OOP/SOLID responsibilities. These make R07/R11 reviewable without adding product roles or unrelated features.

## Out of scope

- Password reset, email delivery or verification, MFA, social signin, roles, permissions, profile editing, and account deletion.
- Refresh tokens, remember-me options, device management, logout-all-devices, and cross-tab synchronization beyond rechecking on navigation/focus.
- A business dashboard, extra application content, custom illustrations, animations, a component library project, or multiple themes.
- Multiple API replicas, Redis, queues, microservices, Kubernetes, cloud infrastructure, hosted environments, published container images or registries, and continuous deployment.
- Exhaustive cross-browser certification, capacity or load certification (B09's local baseline is not one), a formal security audit, or 100% test coverage.

These exclusions constrain this assignment, not a future product. A real public service would need further operational and account-recovery decisions before launch. The [Evolution register](evolution.md) records, for the exclusions already weighed, the scale stage and trigger that would bring each back.

## Scope protection

Implement the required journey and security boundaries before spending time on visual polish or extra tooling. An addition must either satisfy a requirement, close a concrete acceptance gap, or have its benefit and cost recorded as a change. Do not add features solely because a starter template or AI output includes them.

At each milestone, check the requirement IDs it serves, update AI.md with actual assistance, and record evidence without marking future phases complete.
