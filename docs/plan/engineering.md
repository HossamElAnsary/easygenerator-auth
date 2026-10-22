# Engineering Standards and Responsibilities

Return to [PLAN.md](../../PLAN.md). This document defines how we structure and review the implementation. [Architecture](architecture.md) owns runtime behavior and security/data guarantees; [Delivery](delivery.md) owns the implementation order. These are planning decisions, not claims about existing code.

## E01 — Clean code and OOP

The goal is code whose responsibilities, dependencies, and failure behavior are easy to understand and change. Use OOP where Nest's injectable classes provide useful encapsulation, and functional components/hooks for React. OOP does not require an inheritance hierarchy, and using classes alone does not establish good design.

Prefer composition. Keep methods focused on one operation with explicit inputs and results. Use descriptive names, early validation, typed errors, and comments explaining non-obvious reasons such as cookie races or revocation consistency. Avoid unexplained constants, catch-all error swallowing, unnecessary `any`, unsafe assertions, hidden global state, and abstractions with no present use.

Nest supports dependency injection and explicit runtime provider tokens; React's component model supports separating UI responsibilities. These mechanisms support our boundaries but do not enforce good design automatically. [Nest providers](https://docs.nestjs.com/providers), [React component design](https://react.dev/learn/thinking-in-react).

## E02 — Backend responsibility map

From baseline v1.4 this map is the target M8 implemented, without changing any route, response, cookie, schema, rate limit, or database policy. Before M8 the code followed the v1.3 map, in which `UsersService` and `SessionsService` owned their models directly.

| Unit | Owns | Boundary |
| --- | --- | --- |
| `AuthController` | Validated HTTP inputs, status codes, cookie issuance/deletion, public response serialization | Calls AuthService; no database queries or cryptographic work |
| `AuthService` | The authentication use cases: signup, signin, session identity, logout. The only unit that coordinates users, sessions, and hashing | Uses the `UsersRepository` and `PasswordHasher` ports and `SessionsService`; no Express request/response objects, Mongoose, or Argon2 |
| `UsersRepository` (port) and its MongoDB adapter | Port: the user persistence capabilities in E03. Adapter: the user model, normalized-email lookup, translation of only the email-index conflict, and the explicit public projection. The module declares the collection's required indexes in `user.indexes.ts`; the startup gate applies them | Only the adapter imports Mongoose or holds `ObjectId`s; callers see plain domain types with string IDs. Credential lookup stays internal to auth |
| `SessionsService` | Session policy: token generation, shape check, digest, fixed lifetime, expiry against the injected `Clock`, and the revocation-confirmation rule (A10) | Uses the `SessionsRepository` port and `Clock`; no Mongoose; depends on neither auth nor users |
| `SessionsRepository` (port) and its MongoDB adapter | Port: insert a session, delete by digest, authoritative lookup by digest. Adapter: the session model and the linearizable read options. The module declares the collection's required indexes in `session.indexes.ts`; the startup gate applies them | Only the adapter imports Mongoose; it applies no expiry or confirmation policy |
| `PasswordHasher` (port) and its Argon2 adapter | Argon2id hashing, verification, dummy verification, configured parameters | Encapsulates the maintained library; never modifies password input |
| `SessionGuard` | Cookie extraction, authentication requirement, safe user context | Calls AuthService; checks public-route metadata; no persistence or hashing logic |
| `DatabaseModule` | The Mongoose connection with the fixed concern policy, the writable-primary check, readiness, and the shared database time budget | Registered once by the composition root with its index gate; global, because `MongooseModule.forFeature()` resolves the connection application-wide; knows no feature module |
| Startup index gate | Verifying every repository's required indexes before the application is ready | Lives in the composition root, the only code allowed to know every module |
| Schema validation pipe | Applying shared request schemas | Produces structured validation failures without duplicating policy |
| Exception filter | Mapping typed failures to safe HTTP errors and request IDs | Preserves distinction between rejected credentials and unavailable dependencies |
| HTTP request controls | Origin/header/content-type policy, rate/body limits, headers, safe logging | Apply independently of whether a route requires authentication |

### Module layout and dependency rules

```text
apps/api/src/
  main.ts, application.ts, app.module.ts, startup index gate   # composition root: the only code that imports every module
  config/            # validated runtime configuration
  common/            # vendor-free domain and dependency errors
  infrastructure/
    database/        # DatabaseModule, concern options, withDatabase, index verification, local initializer
    logging/         # AppLogger
    clock/           # Clock
  http/              # middleware, schema pipe, exception filter, failure mapping, rate limits, request errors
  modules/
    auth/            # index.ts, controller, AuthService, PasswordHasher port + Argon2 adapter, cookie, guard, decorators
    users/           # index.ts, UsersRepository port + MongoDB adapter, schema
    sessions/        # index.ts, SessionsService, SessionsRepository port + MongoDB adapter, schema, token functions
    health/          # index.ts, module, controller, service
```

These rules apply to `apps/api/src`. `dependency-cruiser`, run by `npm run lint`, enforces them, so CI and `npm run check` fail on a violation (T18). Tests under `apps/api/test` may import internals. From v1.5 the same configuration also checks `apps/web/src`: E05's two layer rules, and the cycle, unresolved-import, and test-import rules (T20).

1. Code outside a feature module, including the composition root, reaches it only through `modules/<name>/index.ts`. The index exports what other code needs (module class, ports, public types and decorators, and the collection's required-index specification for the startup gate), never an adapter or schema.
2. `users` and `sessions` import neither `auth` nor each other. Orchestration flows from auth downward.
3. `config/`, `common/`, `infrastructure/`, and `http/` never import `modules/`.
4. `mongoose`, `@nestjs/mongoose`, and the `mongodb`/`bson` driver packages are imported only by MongoDB adapters, schemas, the `users` and `sessions` module files (which register their models), `infrastructure/database/`, `config/` (which parses `MONGODB_URI` with the pinned driver), and the composition root (whose index gate reads collections from the connection). `argon2` is imported only by the Argon2 adapter. A module's `index.ts` never re-exports an adapter or schema.
5. No circular dependencies.

Typed errors keep one owner each. Domain and dependency errors (`InvalidCredentials`, `Unauthenticated`, `EmailInUse`, `DependencyUnavailable`) live in `common/`; request-control and validation errors live in `http/`; `describeFailure()` remains the single mapping to A05. Name each fixed budget once, next to its owner: the 5-second database budget in `infrastructure/database/`, the request/header timeouts and the 16 KiB body limit in `http/` or the composition root. Do not create a project-wide `constants`, `utils`, or `helpers` module.

AuthModule imports UsersModule and SessionsModule. Each feature module registers its own model and exports only its port or service through `index.ts`. Two modules are global: the vendor-free kernel (validated configuration, `AppLogger`, `Clock`), used nearly everywhere, and `DatabaseModule`, because `@nestjs/mongoose` 12's `forFeature()` builds its model providers in a module with no imports, so the connection token must resolve application-wide (the same reason its own core module is global). Avoid circular imports, `forwardRef` workarounds, and a module for every utility.

### Ports and adapters

A port is an abstract class that is also the Nest injection token, bound with `{ provide: Port, useClass: Adapter }`, as `PasswordHasher` already is. v1.4 adds ports for the two repositories for two concrete reasons: rule 4 becomes checkable (policy code cannot reach Mongoose), and session policy becomes unit-testable without a database. Do not add a pass-through wrapper between port and adapter, a generic base repository, entity classes for plain records, or an interface for every class. TypeScript-only interfaces are not runtime injection tokens. [Nest custom providers](https://docs.nestjs.com/fundamentals/custom-providers).

## E03 — Service capability contracts

Names can be adjusted for readability while preserving these responsibilities.

| Capability | Required result / failure behavior |
| --- | --- |
| `AuthService.signup(input)` | Accept validated normalized fields; hash password; create user; return PublicUser; create no session |
| `AuthService.signin(input)` | Verify credentials; persist session; return PublicUser plus internal cookie material only after acknowledgment |
| `AuthService.authenticate(token)` | Resolve valid session and existing user; return PublicUser or unauthenticated; dependency failure remains an error |
| `AuthService.logout(token)` | Revoke the presented session with the documented idempotency/confirmation rules |
| `UsersRepository.create(inputWithHash)` | Persist one user, translate only a recognized email-index conflict, return PublicUser |
| `UsersRepository.findCredentialsByEmail(email)` | Return an internal credential record (the PublicUser plus the hash) or absence; never a public response |
| `UsersRepository.findPublicById(id)` | Return explicitly projected PublicUser or absence |
| `SessionsService.issue(userId)` | Generate the token, persist only its digest with the fixed expiry, and return raw token and expiry for internal cookie issuance after acknowledgment |
| `SessionsService.findActiveUserId(token)` | Check token shape before any database call, perform the authoritative read, enforce expiry against server time taken after the read, return user ID or absence |
| `SessionsService.revoke(token)` | Delete only the presented session; when nothing was deleted, confirm absence with the authoritative read; propagate unavailable/uncertain results |
| `SessionsRepository.insert / deleteByDigest / findByDigest` | Persist or remove one session record and report the driver's acknowledged outcome; perform the primary, linearizable, time-bounded lookup; apply no expiry or confirmation policy |
| `PasswordHasher.hash / verify / verifyUnknownAccount` | Preserve password bytes and apply the hashing policy without exposing library details to auth orchestration |

Use separate types for request input, internal credential/session results, and public responses. Do not return Mongoose documents directly, and keep `ObjectId` inside the adapters. The controller explicitly returns `{ user }` after setting a signin cookie; it must never serialize the internal session result wholesale. Treat a database outage differently from a missing record.

## E04 — SOLID applied to this application

| Principle | Concrete commitment | Review example |
| --- | --- | --- |
| Single responsibility | HTTP, orchestration, session policy, persistence, hashing, validation, and UI state have clear owners | Changing cookie flags should not require changing the password verifier; changing the read concern should not touch expiry policy |
| Open/closed | Isolate changeable details behind existing capability boundaries | Replacing the hashing or storage adapter should preserve the signin use case; avoid hypothetical extension systems |
| Liskov substitution | Replacements/test doubles preserve result, error, and security contracts | A fake sessions repository cannot turn a failed write into success or skip the authoritative-read semantics the policy relies on |
| Interface segregation | Expose only the capabilities/data each caller needs | Public-user callers never receive password hashes; a module's `index.ts` exports its port, not its adapter; components get focused props |
| Dependency inversion | Orchestration and policy consume injected ports instead of constructing or importing infrastructure clients | AuthService and SessionsService import no Mongoose or Argon2, and T18's rules fail the build if they do; the composition root selects adapters |

SOLID is a review discipline here. Dependency injection alone is not proof of dependency inversion, and splitting a function into more files is not proof of single responsibility. Introduce an abstraction when it protects an actual boundary or enables a meaningful replacement/test; otherwise keep the implementation direct.

## E05 — Frontend boundaries

- The API client owns relative URLs, credentialed same-origin requests, response decoding, timeout/cancellation, and typed HTTP errors.
- TanStack Query owns session data and its request lifecycle. The auth provider/hook derives UI status, coordinates boot/focus/reconnect/navigation checks and auth actions, and prevents stale responses; it does not copy user data into another store. Architecture A11 owns package configuration and credential-submission exceptions.
- Route guards render or redirect from that state; they do not replace backend enforcement. From v1.5 they are wrapper components in `auth/guards.tsx` (`PublicOnly`, `RequireSession`, and the home redirect) that take what they guard as children, so pages hold no redirect logic. Every auth action is followed by a session check, during which `RequireSession` withholds its content; state that must survive that check, such as a failed logout's message, sits above the guard, so `ApplicationPage` composes `RequireSession` around its content rather than being wrapped by it.
- `SignupForm` and `SigninForm` (named SignupPage/SigninPage before v1.5) each use component-local React Hook Form with their own shared Zod resolver and schema-derived types for form values, validation, pending/error presentation, and accessibility, and submit through the auth provider's actions. ApplicationPage owns the welcome/logout presentation and invokes the provider's logout action. Forms do not bypass auth-state coordination by calling the client directly.
- Share an auth layout and small field/error components where repetition exists. From v1.5 the two forms are explicit components, not one component with a mode flag: they compose `AuthFormFrame` (heading, notices, the `noValidate` form, request error, submit button, footer link) with their own fields, and share `useAuthForm`, which holds A11's form configuration and the one mapping of server field errors. It wraps React Hook Form for these two forms only; it is not a general form framework. Shared components take what differs (autocomplete, hints) as props, not a mode boolean. Keep credentials in transient component state; do not use application-global or persistent storage for form passwords.
- Use functional components and hooks, descriptive props, and derived state. Keep auth pages/hooks/API functions together by feature, with shared UI and transport utilities separate. Avoid class hierarchies, scattered raw fetch calls, duplicated validation, or a custom generic form framework for three fields.
- Layout (v1.5). `api/` is transport and imports nothing from `auth/` or `ui/`. `auth/` holds the coordinator, session options, guards, forms, the application page, and request-error presentation (messages, rate-limit waits). `ui/` is presentational and imports neither `api/` nor `auth/`. `npm run lint` enforces both, directly or through any other module, with `dependency-cruiser`, as it does the API's E02 rules. The provider's context value has an explicit `AuthContextValue` type, so consumers depend on a declared contract rather than on whatever the hook returns. Global element styles and color tokens live in `src/global.css`; component classes stay in CSS Modules and use those tokens.
- Enable React StrictMode in development and enforce Hooks lint rules. Keep rendering pure; handle submissions in event handlers, and let Query own server fetching. Use effects for external synchronization, not to copy query results into local state. Memoize only for a measured performance need or a documented API identity requirement. [React guidance on effects and derived state](https://react.dev/learn/you-might-not-need-an-effect).
- Provide a small application error boundary for unexpected rendering failures with a recovery action. Expected HTTP/form errors stay in their explicit UI states; an error boundary is not the async error handler. Prefer accessible HTML, visible labels/errors, and meaningful interaction tests over implementation snapshots.

## E06 — Verification and review

Use behavior tests at boundaries: validation examples, real database uniqueness/session behavior, API failure cases, and the complete browser journey. Test doubles must simulate the same contracts and distinguish absence, invalid input, failed writes, and uncertain acknowledgment. Do not mock real persistence away in the tests that establish database guarantees.

T16 must review the responsibility map, dependency direction, public-data projection, shared policy ownership, error semantics, readable naming/types, and the absence of unused abstractions. From v1.4, T18 makes the E02 dependency rules executable; a passing rule set does not replace T16's judgment about responsibilities. T04/T06/T08/T12 verify database/security decisions; T09/T10 verify UI behavior. No test count, coverage percentage, or line-count target substitutes for those outcomes.

Test placement (v1.4; [Evolution register](evolution.md) EV-TEST-01/02). A unit test sits beside the file it tests as `<file>.test.ts`, in the API as in the web app; it does not move into a `tests/` folder as its module grows. Application-level integration suites, which start the real application against MongoDB and cross modules, stay in `apps/api/test/` as `*.integration.test.ts`, with their shared support. A fake stays inside its test file until a second test needs it, then moves under `test/`, never into a production source file. Unit tests under `src/` follow E02's dependency rules, so outside the persistence paths one that imports Mongoose or the MongoDB driver fails lint; production code never imports a test file. The two unit tests still in `apps/api/test/` move in M9's first step.

Unit tests of session policy may use an in-memory sessions repository only if it honors the port's contract (acknowledged writes, absence versus failure, no expiry filtering of its own). The tests that establish database guarantees (uniqueness, linearizable lookup, revocation confirmation against a real replica set, uncertain acknowledgment) keep using real MongoDB.

When a change alters an API, schema, authentication policy, database guarantee, or dependency boundary, update its owning plan section and affected acceptance checks together. Continue documenting actual assistance and corrections in AI.md. Progress and test results remain in Delivery and Verification.
