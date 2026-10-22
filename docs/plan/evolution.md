# Evolution and Scaling Register

Return to [PLAN.md](../../PLAN.md). This document owns improvements that were weighed and **not** adopted for the current scope, and the conditions that would bring each one back. Current decisions stay with their owners: [Architecture](architecture.md) for runtime and security contracts, [Engineering](engineering.md) for code structure, [Requirements](requirements.md) for scope. An entry here never changes a contract; adopting one goes through Delivery's change log like any other change.

## How to use this register

- **Add an entry only after a real challenge.** An idea is weighed in conversation, review, or measurement, and deferred or rejected for a stated reason. The entry is written in the same change as the Delivery change-log row that records the decision. No speculative wish-list items.
- **Every entry names its trigger:** an observable condition, not an invented traffic number. When the trigger is met, the entry is reconsidered, not automatically implemented.
- **Statuses:** **Deferred** (right at a later stage, not now); **Adopted** (moved into the plan; the entry points to the milestone and stops changing); **Rejected** (not worth doing even at scale, with the reason, so the question is not reopened without new evidence).
- **Cost** is relative: **S** (hours, one area), **M** (days, several areas or a contract change), **L** (weeks, new infrastructure or operations).
- **IDs are stable** (`EV-<LAYER>-NN`); retire an entry by changing its status, never by deleting it.

## Scale stages

| Stage | Situation | What changes |
| --- | --- | --- |
| **S1 — Today** | One API process behind a same-host proxy, a single-node replica set, one developer, local and Docker previews | Baseline v1.4 |
| **S2 — Public production** | Real users on a hosted HTTPS deployment | Recovery, abuse defense, backups, observability, and on-call become requirements |
| **S3 — Horizontal scale** | More than one API instance | No correctness-relevant state may live in one process |
| **S4 — Product growth** | More features, modules, or contributors than the assignment | Code organization and team boundaries start to matter |

## Index

| ID | Improvement | Status | Stage | Cost |
| --- | --- | --- | --- | --- |
| [EV-TEST-01](#ev-test-01--unit-tests-beside-their-source) | Unit tests beside their source | Adopted (M9) | S1 | S |
| [EV-TEST-02](#ev-test-02--per-module-tests-folder-when-a-second-unit-test-appears) | Per-module `tests/` folder when a second unit test appears | Rejected | — | S |
| [EV-TEST-03](#ev-test-03--integration-suites-grouped-by-area) | Integration suites grouped by area | Deferred | S4 | S |
| [EV-TEST-04](#ev-test-04--shared-contract-faithful-fakes-per-port) | Shared contract-faithful fakes per port | Deferred | S4 | S |
| [EV-APP-01](#ev-app-01--an-application-layer-for-cross-module-use-cases) | An application layer for cross-module use cases | Deferred | S4 | M |
| [EV-APP-02](#ev-app-02--entity-classes-for-domain-records) | Entity classes for domain records | Deferred | S4 | M |
| [EV-APP-03](#ev-app-03--a-facade-per-module) | A facade per module | Deferred | S4 | S |
| [EV-APP-04](#ev-app-04--three-layer-repositories) | Three-layer repositories | Rejected | — | M |
| [EV-APP-05](#ev-app-05--microservices) | Microservices | Rejected | — | L |
| [EV-HTTP-01](#ev-http-01--a-shared-rate-limit-store) | A shared rate-limit store | Deferred | S3 | M |
| [EV-HTTP-02](#ev-http-02--per-account-signin-limits) | Per-account signin limits | Deferred | S2 | M |
| [EV-HTTP-03](#ev-http-03--api-versioning) | API versioning | Deferred | S4 | M |
| [EV-PERF-01](#ev-perf-01--bounded-password-hashing-admission) | Bounded password-hashing admission | Deferred | S2 | M |
| [EV-PERF-02](#ev-perf-02--thread-pool-size-per-deployment) | Thread-pool size per deployment | Adopted (M9, documentation) | S1 | S |
| [EV-DATA-01](#ev-data-01--the-session-read-policy) | The session read policy | Measured in M9; the user decides | S1 | S |
| [EV-DATA-02](#ev-data-02--an-index-on-sessions-user-id) | An index on sessions' user ID | Deferred | S4 | S |
| [EV-DATA-03](#ev-data-03--a-multi-node-replica-set-with-backups-and-restore-drills) | A multi-node replica set with backups and restore drills | Deferred | S2 | L |
| [EV-DATA-04](#ev-data-04--returning-to-mongodb-8x) | Returning to MongoDB 8.x | Deferred | S1 | S |
| [EV-SEC-01](#ev-sec-01--password-reset-and-email-verification) | Password reset and email verification | Deferred | S2 | L |
| [EV-SEC-02](#ev-sec-02--a-generic-signup-response) | A generic signup response | Deferred | S2 | M |
| [EV-SEC-03](#ev-sec-03--multi-factor-authentication) | Multi-factor authentication | Deferred | S2 | L |
| [EV-SEC-04](#ev-sec-04--jwt-claims-and-role-based-access) | JWT claims and role-based access | Deferred | S4 | M |
| [EV-OPS-01](#ev-ops-01--a-hosted-https-deployment) | A hosted HTTPS deployment | Deferred | S2 | L |
| [EV-OPS-02](#ev-ops-02--metrics-tracing-and-log-shipping) | Metrics, tracing, and log shipping | Deferred | S2 | M |
| [EV-OPS-03](#ev-ops-03--separate-liveness-and-readiness-checks) | Separate liveness and readiness checks | Deferred | S2 | S |
| [EV-WEB-01](#ev-web-01--locales-and-right-to-left-layouts) | Locales and right-to-left layouts | Deferred | S4 | M |
| [EV-WEB-02](#ev-web-02--cross-tab-sign-out) | Cross-tab sign-out | Deferred | S4 | S |
| [EV-WEB-03](#ev-web-03--a-component-library) | A component library | Deferred | S4 | M |
| [EV-WEB-04](#ev-web-04--cross-browser-testing) | Cross-browser testing | Deferred | S2 | S |
| [EV-DEL-01](#ev-del-01--continuous-deployment-published-images-and-releases) | Continuous deployment, published images, and releases | Deferred | S2 | M |

## Testing and code organization

### EV-TEST-01 — Unit tests beside their source

- **Status:** Adopted. Engineering E06 sets the convention (v1.4, 2026-10-22); M9's first step moved the two existing unit tests (`7d49a90`).
- **Before:** two of the API's 14 test files were unit tests (`config.test.ts`, `sessions-policy.test.ts`), kept in `apps/api/test/` with the integration suites; they are now `src/config/runtime-config.test.ts` and `src/modules/sessions/sessions.service.test.ts`.
- **Improvement:** a unit test sits beside the file it tests as `<file>.test.ts`, as the web app already does. Under `src/`, the boundary rules check unit tests too, so one that starts using the database fails lint.
- **Why not standalone now:** moving two discoverable files solves no observed problem and would cost a full verification cycle; M9 adds unit tests anyway, so the move rides along.
- **Source:** the user's proposal and its challenge, 2026-10-22 (Delivery change log).

### EV-TEST-02 — Per-module `tests/` folder when a second unit test appears

- **Status:** Rejected.
- **Proposal:** a module keeps one unit test beside its source, then moves its tests into a `tests/` folder once it has two or more.
- **Why rejected even at scale:** a count threshold forces file moves when the second test arrives and leaves two layouts in one codebase. A test named after its source pairs visibly in any folder. If a module has so many files that tests crowd it, the module is too large; split the module (EV-APP-01) rather than hide its tests.
- **Source:** the user's proposal, 2026-10-22.

### EV-TEST-03 — Integration suites grouped by area

- **Status:** Deferred. **Stage:** S4. **Cost:** S.
- **Today:** 11 integration suites in one folder, beside a toolchain check and two unit tests; the largest are `failures.integration.test.ts` (386 lines) and `http-pipeline.integration.test.ts` (331).
- **Improvement:** folders by area (`test/auth/`, `test/http/`, `test/database/`), and splitting suites that mix concerns.
- **Trigger:** about 20 integration suites, or a suite whose cases no longer share one setup.
- **Source:** the test-placement challenge, 2026-10-22.

### EV-TEST-04 — Shared contract-faithful fakes per port

- **Status:** Deferred. **Stage:** S4. **Cost:** S.
- **Today:** the in-memory sessions repository lives inside the one test that uses it.
- **Improvement:** one fake per port, honoring the port's contract (Engineering E06), shared by every unit test of its consumers.
- **Trigger:** a second test file needs the same fake.
- **Constraint:** the fake lives under `test/` or in a file the production build excludes; a fake under `src/` would be compiled into `dist/` and the Docker image.
- **Source:** the test-placement challenge, 2026-10-22.

## Application and domain

### EV-APP-01 — An application layer for cross-module use cases

- **Status:** Deferred. **Stage:** S4. **Cost:** M.
- **Today:** `AuthService` is the only use case that coordinates modules (users, sessions, hashing) and plays this role inside `auth`.
- **Improvement:** a `src/application/` layer, as in the user's NestJS template, holding use cases that span modules, with a dependency rule that modules never import it.
- **Trigger:** a second use case that coordinates two or more modules, such as account deletion that must also revoke sessions.
- **Source:** the template comparison, v1.4 planning (Delivery M8 decisions).

### EV-APP-02 — Entity classes for domain records

- **Status:** Deferred. **Stage:** S4. **Cost:** M.
- **Today:** users and sessions are plain typed records; the user has three public fields and no rules after creation.
- **Improvement:** entity classes with creation, rehydration, persistence, and public-projection methods, as in the template.
- **Trigger:** a record gains invariants that several operations must keep, such as profile editing, an account status, or email verification state.
- **Source:** the template comparison, v1.4 planning.

### EV-APP-03 — A facade per module

- **Status:** Deferred. **Stage:** S4. **Cost:** S.
- **Today:** each module's `index.ts` exports its port or service directly; every module has one consumer.
- **Improvement:** one facade class implementing a module's public interface.
- **Trigger:** several consumers need a coarser or more stable interface than the module's services provide.
- **Source:** the template comparison, v1.4 planning.

### EV-APP-04 — Three-layer repositories

- **Status:** Rejected.
- **Proposal:** interface, wrapper, and ORM repository, as in the template.
- **Why rejected even at scale:** the wrapper forwards each method one to one and adds no boundary. A second storage backend binds a new adapter to the same port (Engineering E02).
- **Source:** the template comparison, v1.4 planning.

### EV-APP-05 — Microservices

- **Status:** Rejected without new evidence.
- **Why:** one team, one deployment, and one database; the modules already have enforced boundaries inside one process (B08). A process boundary adds network failure, distributed state, and operational cost.
- **What would reopen it:** separate teams with separate release cadences, a component with a demonstrated independent scaling or security-isolation need, or a workload that harms the API's latency and cannot be isolated by a worker process.
- **Source:** the v1.4 architecture review; Requirements' out-of-scope list.

## HTTP API

### EV-HTTP-01 — A shared rate-limit store

- **Status:** Deferred. **Stage:** S3. **Cost:** M.
- **Today:** throttler counters live in memory in one process, reset on restart, and are not shared (Architecture A07).
- **Improvement:** a shared store (for example Redis) behind the throttler's storage interface.
- **Trigger:** a second API instance; with per-process counters, every instance multiplies each limit.
- **Source:** Architecture A07; Requirements' out-of-scope list (multiple replicas, Redis).

### EV-HTTP-02 — Per-account signin limits

- **Status:** Deferred. **Stage:** S2. **Cost:** M.
- **Today:** signin is limited per IP and route; credential stuffing spread across many IPs against one account is not limited (A07: account-level defenses out of scope).
- **Improvement:** a limit keyed by the normalized email, with care that it cannot be used to lock a victim out.
- **Trigger:** public exposure, or evidence of distributed guessing in the logs.
- **Source:** Architecture A07; the v1.4 backend review.

### EV-HTTP-03 — API versioning

- **Status:** Deferred. **Stage:** S4. **Cost:** M.
- **Today:** one first-party web client in the same repository, released together with the API.
- **Improvement:** a versioned path or header, with a deprecation policy.
- **Trigger:** a client released independently of the API, such as a mobile app or a third-party integration (Architecture A09 asks for a transport review at that point).
- **Source:** Architecture A09's reconsideration conditions.

## Performance

### EV-PERF-01 — Bounded password-hashing admission

- **Status:** Deferred. **Stage:** S2. **Cost:** M (an A05/A07 contract addition and tests).
- **Today:** Argon2 runs on libuv's thread pool behind per-IP limits, with an unbounded wait queue.
- **Improvement:** at most N hashes in flight and a bounded wait, answering `503` with `Retry-After` beyond it, so overload fails fast instead of waiting toward the 15-second request timeout.
- **Why deferred:** M9 measured the queue (Verification T19). With the default 4 threads, signup and signin stop at about 235 requests per second from 16 connections, and the median wait grows to about 270 ms at 64. The queue slowed only hashing requests: `/api/health` kept a 0.3 ms median at every load. Admission control would add a new failure response for an overload that one process behind per-IP limits does not reach at stage S1.
- **Trigger:** production metrics showing signin or signup latency approaching the request timeout, or sustained hashing queues; or several API instances sharing one CPU budget.
- **Source:** the v1.4 backend review; M9 measurements (Delivery change log).

### EV-PERF-02 — Thread-pool size per deployment

- **Status:** Adopted in M9 as deployment guidance (`docs/development.md`), with no default change.
- **Measured:** on a 14-CPU machine, 8 threads raised hashing throughput to about 440 requests per second with `/api/health` p99 at 1.6 ms under load; 16 threads reached about 560 but raised health p99 to about 22 ms.
- **Why not a fixed default:** the right size depends on the deployment's CPUs; 8 threads on a 2-vCPU host would oversubscribe it.
- **Source:** M9 measurements.

## Persistence

### EV-DATA-01 — The session read policy

- **Status:** Measured in M9; the decision is the user's, and any change updates A10 and its checks first.
- **Today:** a linearizable read on every authenticated request. On the single-node set it costs about 105 ms, against 0.4 ms for a majority read, because the read waits for the next journal commit: with `journalCommitInterval` set to 10, 50, and 100 ms, its median was 12.5, 54.5, and 105 ms. `/api/auth/me` throughput is therefore bounded by concurrent connections (about 9.6 requests per second each), not CPU.
- **Options:** (1) keep it (A10 as written); (2) tune the server's journal commit interval, a deployment setting that trades more frequent journal flushes for lower latency and changes no guarantee; (3) majority reads, accepting that a deposed primary can briefly honor a revoked session during a failover; (4) linearizable reads only where revocation is confirmed, majority elsewhere, with the same risk as (3) on authenticated requests.
- **Trigger for revisiting:** the cost measured on the real production replica set, where replication rather than the local journal timer decides it, exceeds the authenticated-request latency budget.
- **Source:** Architecture A10; the v1.4 backend review.

### EV-DATA-02 — An index on sessions' user ID

- **Status:** Deferred. **Stage:** S4. **Cost:** S.
- **Today:** sessions are found only by token digest.
- **Improvement:** a `userId` index, which "log out everywhere", device lists, and session cleanup on account deletion need.
- **Trigger:** any of those features entering scope.
- **Source:** Requirements' out-of-scope list (device management, logout-all-devices).

### EV-DATA-03 — A multi-node replica set with backups and restore drills

- **Status:** Deferred. **Stage:** S2. **Cost:** L.
- **Today:** a single-node replica set with no redundancy; the read and write concerns are exercised, failover is not.
- **Improvement:** three or more members, scheduled backups, tested restores, and failover tests against the session read policy.
- **Trigger:** real user data.
- **Source:** README limitations; Delivery M5 limitations.

### EV-DATA-04 — Returning to MongoDB 8.x

- **Status:** Deferred. **Stage:** S1. **Cost:** S.
- **Today:** pinned to 7.0.45, because 8.0 refuses to start on Linux kernels 6.19 through 7.0.13 (Architecture A08).
- **Trigger:** an 8.x release that starts on those kernels, and in any case before 7.0's end of life on 2027-08-31. The Compose volume is named per major version (CLAUDE.md), so the move also chooses between a fresh volume and MongoDB's documented in-place upgrade.
- **Source:** the M5 CI failure (Delivery change log).

## Security

### EV-SEC-01 — Password reset and email verification

- **Status:** Deferred. **Stage:** S2. **Cost:** L.
- **Today:** out of scope; an account without its password cannot be recovered.
- **Improvement:** single-use, expiring reset and verification tokens delivered by email, which needs an email provider.
- **Trigger:** public users.
- **Source:** Requirements' out-of-scope list ("a real public service would need ... account-recovery decisions").

### EV-SEC-02 — A generic signup response

- **Status:** Deferred. **Stage:** S2. **Cost:** M.
- **Today:** signup answers 409 for a registered email, deliberately revealing it (Architecture A05).
- **Improvement:** the same response whether or not the email exists, with the outcome sent by email.
- **Trigger:** public exposure where account enumeration matters; depends on EV-SEC-01's email delivery.
- **Source:** Architecture A05; README limitations.

### EV-SEC-03 — Multi-factor authentication

- **Status:** Deferred. **Stage:** S2. **Cost:** L.
- **Trigger:** accounts holding data worth a targeted attack, or a customer requirement.
- **Source:** Requirements' out-of-scope list.

### EV-SEC-04 — JWT claims and role-based access

- **Status:** Deferred. **Stage:** S4. **Cost:** M.
- **Today:** opaque server-side sessions and no roles (Architecture A09).
- **Trigger:** JWT when independent services need locally verified claims; roles when distinct allowed actions exist. A09 owns these conditions.
- **Source:** Architecture A09.

## Infrastructure and operations

### EV-OPS-01 — A hosted HTTPS deployment

- **Status:** Deferred. **Stage:** S2. **Cost:** L.
- **Today:** production mode was exercised locally and behind a local TLS proxy; the Docker stack is a loopback preview.
- **Improvement:** a hosted environment with TLS termination, secrets management, and the same-host proxy topology Architecture A02 assumes.
- **Source:** README limitations; Requirements' out-of-scope list.

### EV-OPS-02 — Metrics, tracing, and log shipping

- **Status:** Deferred. **Stage:** S2. **Cost:** M.
- **Today:** one safe JSON log line per request and error events (B04), no telemetry platform.
- **Improvement:** latency and error-rate metrics per route, thread-pool and database-pool saturation, distributed tracing, and central logs that keep A07's redaction.
- **Trigger:** a deployment someone is on call for.
- **Source:** Requirements B04's deliberate limit; the v1.4 backend review.

### EV-OPS-03 — Separate liveness and readiness checks

- **Status:** Deferred. **Stage:** S2. **Cost:** S.
- **Today:** `/api/health` reports readiness, including the database.
- **Improvement:** a liveness check that does not touch the database, so an orchestrator does not restart a healthy process during a database outage.
- **Trigger:** a platform that restarts containers on failed health checks.
- **Source:** the v1.4 backend review.

## Web UI

### EV-WEB-01 — Locales and right-to-left layouts

- **Status:** Deferred. **Stage:** S4. **Cost:** M.
- **Today:** English only; Experience fixes the copy word for word.
- **Improvement:** an i18n layer, Arabic with right-to-left layouts, and per-locale copy review.
- **Trigger:** users outside English, recorded as a scope change in Delivery first (CLAUDE.md).
- **Source:** CLAUDE.md's web conventions.

### EV-WEB-02 — Cross-tab sign-out

- **Status:** Deferred. **Stage:** S4. **Cost:** S.
- **Today:** other tabs notice a sign-out on their next navigation, focus, or reconnect check.
- **Trigger:** a requirement for immediate cross-tab consistency.
- **Source:** Requirements' out-of-scope list.

### EV-WEB-03 — A component library

- **Status:** Deferred. **Stage:** S4. **Cost:** M.
- **Today:** a small shared layout and field components with CSS Modules.
- **Trigger:** enough screens that duplicated patterns appear.
- **Source:** Requirements' out-of-scope list.

### EV-WEB-04 — Cross-browser testing

- **Status:** Deferred. **Stage:** S2. **Cost:** S.
- **Today:** the browser suite runs in Chromium only.
- **Improvement:** Firefox and WebKit projects in Playwright, and a screen-reader pass.
- **Trigger:** public users.
- **Source:** README limitations.

## Delivery

### EV-DEL-01 — Continuous deployment, published images, and releases

- **Status:** Deferred. **Stage:** S2. **Cost:** M.
- **Today:** CI checks every push to `main` and every pull request; nothing is deployed or published.
- **Improvement:** images published to a registry under a controlled namespace, tagged releases, and deployment from CI.
- **Trigger:** a hosted environment (EV-OPS-01).
- **Source:** Requirements' out-of-scope list.
