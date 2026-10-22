# How I used AI on this project

I built this project by directing two coding agents. They wrote the code. I made the scope and design calls, set the order of work, asked for reviews and challenges, and kept every outward-facing step (the repository, publishing it, merging pull requests) in my own hands. This page answers the brief's three questions. [docs/ai-record.md](docs/ai-record.md) holds the full log, written milestone by milestone as the work happened.

This page was drafted by Claude Code from the transcripts of every session (13 main sessions and their review subagents), not from memory; I reviewed and merged it.

## At a glance

| | |
| --- | --- |
| **Tools** | **OpenAI Codex** in VS Code (GPT-6): reading the brief, the planning baseline, M1 (foundation), M3 (browser journey), and the final compliance review. **Claude Code** in VS Code (Claude Opus 5.5): CLAUDE.md, M2 (authentication API), M4–M10, and the infrastructure review. |
| **What the AI wrote** | All of it: application code, tests, configuration, CI, Dockerfiles, and documentation. I wrote no code by hand. Claude Code's commits carry its co-author trailer, Codex adds none, and the merge commits on `main` are my own pull-request merges. |
| **What I did** | Chose the stack and the visual direction, asked the design questions that shaped the plan, proposed the frontend libraries, the backend layering, the Docker-only run and the evolution register, authorized each milestone, created and published the GitHub repository, and merged every pull request myself after its CI passed. |
| **Time** | About **7.5 hours** of agent working time to a complete, published submission: planning 1.2 h, M1–M5 5.9 h, publishing 0.3 h. Then about **6 hours** more on extras I asked for: the Docker-only run (1.2 h) and the backend, frontend and infrastructure reviews (5 h). The calendar span is 19–22 October. These numbers come from transcript timestamps, counting only gaps under 15 minutes, so they measure the agents' working time, not my exact hours. |

## How I worked

- **Brief first.** I had Codex convert the PDF to Markdown and then explain the assignment back to me before anything was planned. That explanation already covered the scoring criteria, the AI.md requirement, and the few-hours expectation, not just the feature list.
- **One written source of truth.** I asked for the whole plan before any code: requirement IDs, acceptance checks, and change control in [PLAN.md](PLAN.md) and [docs/plan/](docs/plan/). I then proposed [AGENTS.md](AGENTS.md), so every new session starts from the same goal and rules. CLAUDE.md imports it, so both tools read one guide.
- **One milestone per chat, joined by handoff prompts.** I ended almost every session with *"What is the next step? give me a handoff prompt to give it to a new chat."* Each handoff named the commit SHAs, the passing checks, what was still pending, and what was not authorized (*"Do NOT send the recruiter message, or contact anyone, until I explicitly say so"*). That kept each context small, and it let me move work between Codex and Claude Code without losing state.
- **Independent review on top of the author.** Codex ran separate subagents for the requirements, architecture, UX, and acceptance reviews of the plan, and separate reviewers for backend, frontend, and documentation at the end. In the implementation milestones, Claude Code had a read-only review agent check the diff against the written contracts before committing. For the later reviews I named specific skills (engineering judgment, NestJS, Node.js runtime, architecture, React performance, composition patterns, web interface guidelines, DevOps).
- **Evidence, not claims.** A check counted only when it had actually run. The agents had to prove that tests could fail by planting deliberate bugs (19 in M2, 17 in M10), test against a real MongoDB replica set, run CI on every push, and follow the README from a fresh clone.

## Prompts that worked

Quoted from the transcripts, shortened with "…", with typos fixed.

1. **"I would like to start by the planning phase, we want to plan everything before starting the implementation … and use it as a source of truth to make sure we have reached our goal and we did not diverge from it."** This produced the requirement IDs and acceptance checks that every later session was held to, so "done" always meant a recorded check, not a feeling.
2. **"… are we going to use JWT? Access Token and Refresh Token? are we going to store the token in cookies? are we going to apply Role-based-access-control?"** Asking these as separate questions made the AI separate token format, transport, renewal, and authorization, instead of defaulting to a JWT template. The result was opaque server-side sessions in an HttpOnly cookie, with no refresh flow and no roles, each decision with its reason.
3. **"I was thinking for something like react-hook-form for forms, and tanstack/react-query API calls. what do you think? do you agree?"** The AI agreed, and it found the catch: TanStack Query keeps a mutation's variables, which would have put passwords in a shared cache. Signup and signin therefore stay awaited form actions, and only logout is a mutation.
4. **"I want to have a Dockerfile for each service … so, the user with the easiest way will be able to run the entire application from any environment."** A reviewer can now run the whole app with `docker compose up --wait` and no Node installed.
5. **"I want you to delete the easy-generator folder from my device, and delete the Container and the Images … follow the instructions starting from cloning the repository."** A from-zero run of the README. It found no blocker, only cosmetic issues, and it is the evidence that the README works as written.
6. **"I want you to challenge this proposal, and tell me would it bring value to the project? … is it worth the change?"** Asked about my own idea (below). Explicitly inviting disagreement got a cost-and-benefit answer instead of agreement.

## Where the AI was wrong, and how it was caught

| What went wrong | How it was caught | Fix |
| --- | --- | --- |
| After publishing, the AI declared the project ready for handoff. But a reviewer without Node could not run it, and the README was 21.5 KB of setup, history, and reference mixed together | **I caught it** while reviewing the result as a reviewer would: *"we are not finished yet"* | A Docker-only run (`docker compose up --wait`, no Node) and a README cut to 8.7 KB, then verified from a fresh clone (M7) |
| The planned session check cleared the cookie on a 401, so a slow, stale response could log out a newer signin | Planning review of the race | `GET /api/auth/me` never sets or clears cookies |
| After a 429, the countdown that re-enables the button could stay stuck until reload | CI run #1. It looked flaky; the AI's first theory (a stale clock) didn't reproduce. Sampling 3,000 timers showed some fire 1 ms early | A deterministic failing test, then the fix (`4bf2f2c`) |
| Four unsafe configurations were accepted: production with `TRUST_PROXY=false` (one shared rate-limit bucket), a public origin in development (a cookie without `Secure`), a deprecated `wtimeout` URI option overriding the 5 s write budget, and asset errors returned as 404 | An independent review agent in M4 | Reproduced each one, fixed it test-first (`694b6f2`) |
| Zod's internal `new Function` probe raised a Content-Security-Policy violation on every page load of the M3 bundle | M4 browser checks | Zod runs jitless (`9e8f9c4`); every browser test now fails on any CSP violation |
| The app went blank whenever its folder path contained a dot-folder, because Express's static serving treats it as hidden. The bug had existed since M2 | Only surfaced when M5 ran from a `.claude/worktrees/` checkout | Fix with a regression test (`76fd472`) |
| MongoDB 8.0, pinned in M1, refused to start on GitHub's new runner kernel | CI run #6 | Moved to 7.0.45, with the reason recorded (`b136c59`) |
| `db:ready` gave each probe 3 s, too little for a cold container on a CI runner | CI run #2, diagnosed from the step's 37 s duration | A longer budget plus failure-only diagnostics (`f136be0`) |
| The lint autofix turned a constructor's parameter type into `import type`, which silently broke dependency injection | Found while writing CLAUDE.md | Every constructor dependency uses an explicit `@Inject()` |
| The AI's own credential scan before publishing reported zero hits because of a bug in its command (grep read the pattern as an option) | The AI noticed the command was wrong before relying on the result | Fixed the command, proved it found six planted fake secrets, then rescanned the whole history before the repository went public |
| Smaller misses: tests that missed an off-by-one at exactly 24 hours, a database-module design the installed library doesn't allow, a benchmark that could have dropped a shared database, a plan that would have lost a failed-logout message, and lint rules that only saw direct imports | Deliberate mutations, reading the installed source, review agents, and characterization tests | Each fixed before its milestone closed; details in [docs/ai-record.md](docs/ai-record.md) |

## Decisions I made, and where I went with the AI

**My calls:**

- **Plan first, with AGENTS.md as the shared guide.** This is why separate chats and two different tools stayed consistent.
- **React Hook Form and TanStack Query.** The AI's first plan tracked form and request state by hand. I proposed the libraries, and the plan was rebuilt around them.
- **Asking the authentication questions explicitly.** I took the AI's recommendation (opaque sessions, no JWT, no RBAC), but only after it had to justify each part separately.
- **The Docker-only run and a shorter README.** My response to the gap in the first row of the table above: I specified a Dockerfile per service and one Compose file, so anyone can run the whole application with one command.
- **The backend layering.** I proposed separating the repository, business, and HTTP layers, and asked the AI to compare the backend with my own NestJS template. It took the template's enforced import rules and its abstract-class ports, and rejected the template's extra repository layer, with reasons. The boundaries are now checked in `npm run lint`.
- **The [evolution register](docs/plan/evolution.md).** It was my idea: a file per layer that records the improvements we weighed and deferred, and what would make each worth doing. The AI added the rule that an entry needs a real decision and an observable trigger, so the file doesn't turn into a wishlist.
- **Outward actions stay mine.** I created the repository, authorized making it public, and merged every pull request myself. The recruiter message is sent only when I decide.

**Where the AI disagreed and I agreed:**

- I proposed moving unit tests into a `tests/` folder inside each module once it had a second test file. The AI argued that tests beside their source file are simpler, and that moving two files then wasn't worth a verification cycle. I agreed. The convention was adopted, and my variant is recorded as rejected, with the reason.
- After measuring that linearizable session reads cost about 105 ms per `/api/auth/me` call (MongoDB's journal flush), the AI gave four options and recommended keeping them. I accepted that recommendation: about 0.1 s is acceptable for a local preview, and a signed-out session is rejected immediately. The faster options are recorded in the register with the trigger that would bring them back.

## What I would do differently

- **Stop at the first complete submission.** The brief expects a few hours. The application was complete and published after about 7.5 hours of agent time, and then I spent about 6 more on extras. Each one was verified and is defensible, but by the brief's own speed criterion they cost more than they earned. Next time I would submit at that point and log the further ideas in the evolution register.
- **Keep the documentation lighter.** The planning trail was what let fresh sessions and two different tools pick up the work safely, but it grew to about 67,000 words against about 3,200 lines of source. A reviewer needs the README and this page, not the whole trail.

## Full record

[docs/ai-record.md](docs/ai-record.md) has every milestone: the files the AI touched, the approach that worked, what was corrected, and the checks that ran. [Verification](docs/plan/verification.md) has the evidence for every acceptance check.
