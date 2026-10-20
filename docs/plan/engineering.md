# Engineering Standards and Responsibilities

Return to [PLAN.md](../../PLAN.md). This document defines how we structure and review the implementation. [Architecture](architecture.md) owns runtime behavior and security/data guarantees; [Delivery](delivery.md) owns the implementation order. These are planning decisions, not claims about existing code.

## E01 — Clean code and OOP

The goal is code whose responsibilities, dependencies, and failure behavior are easy to understand and change. Use OOP where Nest's injectable classes provide useful encapsulation, and functional components/hooks for React. OOP does not require an inheritance hierarchy, and using classes alone does not establish good design.

Prefer composition. Keep methods focused on one operation with explicit inputs and results. Use descriptive names, early validation, typed errors, and comments explaining non-obvious reasons such as cookie races or revocation consistency. Avoid unexplained constants, catch-all error swallowing, unnecessary `any`, unsafe assertions, hidden global state, and abstractions with no present use.

Nest supports dependency injection and explicit runtime provider tokens; React's component model supports separating UI responsibilities. These mechanisms support our boundaries but do not enforce good design automatically. [Nest providers](https://docs.nestjs.com/providers), [React component design](https://react.dev/learn/thinking-in-react).

## E02 — Backend responsibility map

| Unit | Owns | Boundary |
| --- | --- | --- |
| `AuthController` | Validated HTTP inputs, status codes, cookie issuance/deletion, public response serialization | Calls AuthService; no database queries or cryptographic work |
| `AuthService` | Signup/signin orchestration; resolving session identity; logout orchestration | Uses UsersService, SessionsService, PasswordHasher; no Express request/response objects or direct Mongoose/Argon2 calls |
| `UsersService` | User persistence, normalized-email lookup, recognized duplicate-email conflicts, public projection | Owns user Mongoose model; credential lookup is explicitly internal |
| `SessionsService` | Token generation/digest, persistence, expiry, authoritative lookup, revocation | Owns session model; accepts user IDs and does not depend on AuthService/UsersService |
| `PasswordHasher` | Argon2id hashing, verification, dummy verification, configured parameters | Encapsulates the maintained library; never modifies password input |
| `SessionGuard` | Cookie extraction, authentication requirement, safe user context | Calls AuthService; checks public-route metadata; no persistence or hashing logic |
| Schema validation pipe | Applying shared request schemas | Produces structured validation failures without duplicating policy |
| Exception filter | Mapping typed failures to safe HTTP errors and request IDs | Preserves distinction between rejected credentials and unavailable dependencies |
| HTTP request controls | Origin/header/content-type policy, rate/body limits, headers, safe logging | Apply independently of whether a route requires authentication |

AuthModule imports UsersModule and SessionsModule and owns the authentication providers. UsersModule and SessionsModule each own their model and export only the service needed by callers. AppModule wires configuration, database startup, auth, health, and static serving. Avoid circular imports, `forwardRef` workarounds, generic base repositories/services, and a module for every utility.

Use a small provider boundary for password hashing. An abstract provider token or an interface with an explicit runtime token may separate the hash contract from its Argon2 implementation; ordinary Nest class-provider tokens are sufficient for first-party user/session services. Do not create matching interfaces for every class by convention. TypeScript-only interfaces are not runtime dependency-injection tokens. [Nest custom providers](https://docs.nestjs.com/fundamentals/custom-providers).

## E03 — Service capability contracts

Names can be adjusted for readability while preserving these responsibilities.

| Capability | Required result / failure behavior |
| --- | --- |
| `AuthService.signup(input)` | Accept validated normalized fields; hash password; create user; return PublicUser; create no session |
| `AuthService.signin(input)` | Verify credentials; persist session; return PublicUser plus internal cookie material only after acknowledgment |
| `AuthService.authenticate(token)` | Resolve valid session and existing user; return PublicUser or unauthenticated; dependency failure remains an error |
| `AuthService.logout(token)` | Revoke the presented session with the documented idempotency/confirmation rules |
| `UsersService.create(inputWithHash)` | Persist one user, translate only a recognized email-index conflict, return PublicUser |
| `UsersService.findCredentialsByEmail(email)` | Return an internal credential record or absence; never a public response |
| `UsersService.findPublicById(id)` | Return explicitly projected PublicUser or absence |
| `SessionsService.issue(userId)` | Persist the token verifier; return raw token and expiry for internal cookie issuance |
| `SessionsService.findActiveUserId(token)` | Check token shape, perform the specified authoritative read, enforce expiry, return user ID or absence |
| `SessionsService.revoke(token)` | Delete only the presented session; confirm revocation; propagate unavailable/uncertain results |
| `PasswordHasher.hash / verify / verifyDummy` | Preserve password bytes and apply the hashing policy without exposing library details to auth orchestration |

Use separate types for request input, internal credential/session results, and public responses. Do not return Mongoose documents directly. The controller explicitly returns `{ user }` after setting a signin cookie; it must never serialize the internal session result wholesale. Treat a database outage differently from a missing record.

## E04 — SOLID applied to this application

| Principle | Concrete commitment | Review example |
| --- | --- | --- |
| Single responsibility | HTTP, orchestration, persistence, hashing, validation, and UI state have clear owners | Changing cookie flags should not require changing the password verifier |
| Open/closed | Isolate changeable details behind existing capability boundaries | Replacing the hashing adapter should preserve the signin use case; avoid hypothetical extension systems |
| Liskov substitution | Replacements/test doubles preserve result, error, and security contracts | A fake session provider cannot accept expired tokens or turn a failed write into success |
| Interface segregation | Expose only the capabilities/data each caller needs | Public-user callers never receive password hashes; components get focused props |
| Dependency inversion | Orchestration consumes injected capabilities instead of constructing infrastructure clients | AuthService has no direct Mongoose model or Argon2 dependency; the composition root selects providers |

SOLID is a review discipline here. Dependency injection alone is not proof of dependency inversion, and splitting a function into more files is not proof of single responsibility. Introduce an abstraction when it protects an actual boundary or enables a meaningful replacement/test; otherwise keep the implementation direct.

## E05 — Frontend boundaries

- The API client owns relative URLs, credentialed same-origin requests, response decoding, timeout/cancellation, and typed HTTP errors.
- TanStack Query owns session data and its request lifecycle. The auth provider/hook derives UI status, coordinates boot/focus/reconnect/navigation checks and auth actions, and prevents stale responses; it does not copy user data into another store. Architecture A11 owns package configuration and credential-submission exceptions.
- Route guards render or redirect from that state; they do not replace backend enforcement.
- SignupPage/SigninPage use component-local React Hook Form with the shared Zod resolver for form values, validation, pending/error presentation, and accessibility, and submit through the auth provider's actions. ApplicationPage owns the welcome/logout presentation and invokes the provider's logout action. Forms do not bypass auth-state coordination by calling the client directly.
- Share an auth layout and small field/error components where repetition exists. Keep credentials in transient component state; do not use application-global or persistent storage for form passwords.
- Use functional components and hooks, descriptive props, and derived state. Keep auth pages/hooks/API functions together by feature, with shared UI and transport utilities separate. Avoid class hierarchies, scattered raw fetch calls, duplicated validation, or a custom generic form framework for three fields.
- Enable React StrictMode in development and enforce Hooks lint rules. Keep rendering pure; handle submissions in event handlers, and let Query own server fetching. Use effects for external synchronization, not to copy query results into local state. Memoize only for a measured performance need or a documented API identity requirement. [React guidance on effects and derived state](https://react.dev/learn/you-might-not-need-an-effect).
- Provide a small application error boundary for unexpected rendering failures with a recovery action. Expected HTTP/form errors stay in their explicit UI states; an error boundary is not the async error handler. Prefer accessible HTML, visible labels/errors, and meaningful interaction tests over implementation snapshots.

## E06 — Verification and review

Use behavior tests at boundaries: validation examples, real database uniqueness/session behavior, API failure cases, and the complete browser journey. Test doubles must simulate the same contracts and distinguish absence, invalid input, failed writes, and uncertain acknowledgment. Do not mock real persistence away in the tests that establish database guarantees.

T16 must review the responsibility map, dependency direction, public-data projection, shared policy ownership, error semantics, readable naming/types, and the absence of unused abstractions. T04/T06/T08/T12 verify database/security decisions; T09/T10 verify UI behavior. No test count, coverage percentage, or line-count target substitutes for those outcomes.

When a change alters an API, schema, authentication policy, database guarantee, or dependency boundary, update its owning plan section and affected acceptance checks together. Continue documenting actual assistance and corrections in AI.md. Progress and test results remain in Delivery and Verification.
