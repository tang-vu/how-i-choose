# Progress log

Updated: 2026-08-31 (Asia/Saigon)

## M0 — Environment and requirements verified

Work completed:

- Inspected the empty repository, Git state, remote, runtime, package managers, GitHub auth, hosting CLI/auth state, and existing files.
- Confirmed GitHub authentication belongs to `tang-vu` with repository/workflow scope.
- Confirmed the current official challenge deadline and submission/judging requirements.
- Read current official OpenAI Site tools guidance, Chrome imperative WebMCP guidance, and the August 26, 2026 draft.
- Confirmed ChatGPT requires imperative registration through `document.modelContext.registerTool()` from the top-level page; declarative form tools and iframe registrations are unsupported.
- Completed independent accessibility/safety and architecture/test reviews.

Validation run:

- `git status`, remotes, branch, and history inspected.
- Node `v24.14.1`, pnpm `11.20.0`, npm `11.11.0`, Corepack `0.34.6` recorded.
- `gh auth status` and repository metadata checked.
- Vercel CLI is not globally installed, but an authenticated local Vercel configuration and account were detected via an ephemeral current CLI check.

Remaining risks:

- Real ChatGPT Site tools discovery has not been tested and remains unverified.
- The WebMCP API is experimental and the challenge schedule is compressed.
- No production deployment exists yet.

Verified deployment URL: none yet.

## M1 — Public open-source repository initialized

Work completed:

- Changed `tang-vu/how-i-choose` from private to public.
- Added the root MIT `LICENSE`.
- Preserved the pre-existing initial commit and public history.

Validation run:

- GitHub visibility returned `PUBLIC`.
- `git diff --check` passed.
- Commit `9c2f70b1eb312eb9b81be94d12a5972341822c0e` was pushed to `origin/main` and verified with `git ls-remote`.
- Worktree was clean after push.
- Application lint, typecheck, unit, E2E, and build scripts did not exist at this pre-scaffold milestone; no pass is claimed.

Remaining risks:

- GitHub license detection can lag after the first push and will be checked again during release hardening.
- Product, tests, docs, deployment, and submission assets remain to be built.

Verified deployment URL: none yet.

## M2 — Product contract and delivery documents

Work completed:

- Added `AGENTS.md`, `PLAN.md`, `PROGRESS.md`, `DECISIONS.md`, and `RISKS.md` before application implementation.
- Captured repository structure, command contract, architectural boundaries, accessibility and privacy requirements, WebMCP constraints, commit protocol, milestone gates, dependencies, cut lines, demo path, primary decisions, and the required risk register.
- Incorporated the independent WebMCP, architecture/test, and accessibility/safety reviews.

Validation run:

- Verified all required sections and required named risks with repository searches.
- `git diff --check` passed.
- Application lint, typecheck, unit, E2E, and build scripts still do not exist at this pre-scaffold documentation milestone; no pass is claimed.

Remaining risks:

- All implementation, automated quality gates, deployment, and real ChatGPT discovery remain outstanding.

Verified deployment URL: none yet.

## M3 — Application scaffold, quality gates, and early production deployment

Work completed:

- Added a pinned Next.js 16 App Router and React 19 static-export application with strict TypeScript, Tailwind CSS 4, ESLint, Vitest, Testing Library, fast-check, Playwright, axe, Dexie, Zustand, and Zod.
- Added an original responsive product shell, semantic primary navigation, synthetic `/demo/` route, local favicon/OG artwork, no runtime external fonts, useful 404 page, build/version footer, visible Site tools feature detection, and baseline privacy/safety wording.
- Added strict CSP and security headers for Vercel, production-static Playwright serving, desktop/narrow projects, and initial accessibility smoke checks.
- Deployed production over HTTPS and connected the public GitHub repository to the authenticated Vercel project.
- Updated the GitHub repository description, homepage, and confirmed MIT license detection.

Validation run:

- `pnpm peers check` passed with no peer dependency issues.
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test` passed: 1 file, 2 tests.
- `pnpm test:e2e` passed: 6 tests across desktop and narrow Chromium; initial `/` and `/demo/` states had zero serious or critical axe findings.
- `pnpm build` passed and emitted static `/`, `/demo`, and 404 pages.
- HTTPS smoke checks returned `200` for `/` and `/demo/`, with CSP, Permissions Policy, HSTS, referrer, nosniff, and frame-deny headers present.
- The first production deployment was created from the pre-scaffold Git HEAD; it will be redeployed after this milestone commit so the visible footer matches source.

Remaining risks:

- The current shell is not yet the complete interactive product.
- Manual keyboard, screen-reader, forced-colors, and 400% reflow checks are not yet complete.
- Real ChatGPT Site tools discovery remains unverified because tools are not implemented yet.
- Vercel reports the broad Node engine range may auto-upgrade; pinning the deployment major is deferred to release hardening.

Verified deployment URL: https://how-i-choose.vercel.app

Current next milestone: M4 — versioned domain model, deterministic rehearsal engine, and property tests.

## M4 — Versioned domain model and deterministic rehearsal engine

Work completed:

- Added strict, bounded Zod schemas for profiles, active/draft/retired rules, signals, contexts, disclosures, scenarios, structured partner turns, events, sessions, and partner-adherence reports.
- Added an explicit exhaustive rehearsal transition table with owner-only pause resume, pre-start owner approval, terminal Stop behavior for partner turns, debrief, staged patch review, and completion.
- Added deterministic active-rule selection, equal-strength conflict detection, hard-boundary dominance, derived rehearsal policy, Unicode-safe word counting, and structured turn validation.
- Enforced one-question turns, question word limits, option limits/distinctness, no preselection, allowed channel, no timers, required signal controls, pause/stop, pending acknowledgments, more-time, not-sure, information, and meaning-preserving rephrase behavior.
- Added advisory-only phrase linting without claims about neutrality, coercion, emotion, comprehension, or capacity.
- Added canonical JSON and SHA-256 profile hashing, monotonic ratification output, and partner-only adherence report categories.
- Added the clearly labeled synthetic Maya profile, approved low-stakes workshop scenario, required signals, and a valid structured demo turn.

Validation run:

- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test` passed: 5 files, 34 tests.
- fast-check properties cover active-rule ordering independence, canonical hash stability under set-like ordering, and deterministic word counting.
- Table/unit checks cover draft/retired irrelevance, block dominance, conflict symmetry, multi-question and word-limit rejection, missing signal controls, no timer/default, pause, Stop, more time, not-sure, information, rephrase, report categories, strict imports, and monotonic ratification.
- E2E and build were not required for this browser-independent domain milestone; the previous scaffold evidence remains green.

Remaining risks:

- Revision compare-and-swap, idempotency, atomic persistence, immutable snapshots, import/export transactions, and allowlisted agent projections belong to M5 and are not yet implemented.
- Policy controlled-value keys are intentionally closed by engine recognition; editor UI must offer controlled choices rather than unvalidated free-form permissions.
- Real ChatGPT Site tools discovery remains unverified.

Verified deployment URL: https://how-i-choose.vercel.app (still deployed at scaffold commit `e2e8aab` until this milestone is pushed and redeployed).

Current next milestone: M5 — revision-safe persistence, history, and shared application services.

## M5 — Revision-safe persistence, history, and application services

Work completed:

- Added Dexie tables for profiles, sessions, scenarios, immutable profile versions, metadata-only activity receipts, and command idempotency records.
- Added one repository transaction boundary that rechecks profile/session revisions, resolves idempotency, validates every next document, commits all related writes together, and records sanitized success/failure receipts.
- Added deterministic command fingerprinting before transactions so Web Crypto promises do not escape Dexie transaction lifetimes.
- Added safe, size-bounded, strict JSON import/export that validates the complete document before replacing local records.
- Added a separate durable app projection store and transient-only UI preference store.
- Added structurally separate `OwnerWorkflowService` and `AgentRehearsalService`; the agent-safe service has no ratify, resume, import/export, share, or delete capability.
- Added owner rule editing, person-selected semantic signals, owner resume/start, visible ratification with immutable snapshots, approved agent start, and validated partner-turn persistence through the same repository and domain logic.
- Added deny-by-default allowlisted agent projections. Disclosures and entity visibility must both allow a field; private notes are not present in the projection type or serialized result.

Validation run:

- `pnpm typecheck` passed.
- `pnpm test` passed: 6 files, 48 tests.
- Tests cover atomic profile/session updates, stale profile and session rejection, same-payload replay, changed-payload key rejection, rollback after invalid next state, exact owner-authored signals, invalid/valid partner-turn persistence, immutable ratified history, canonical import/export round trip, pre-mutation import rejection, database close/reload, metadata-only receipts, and private-field noninterference.
- `pnpm lint` will run with the final milestone diff immediately before commit.
- E2E and build were not required for this persistence/application milestone; UI integration follows in M6.

Remaining risks:

- UI integration must refresh hydrated projections after every command and provide visible correlation/recovery messaging.
- Only schema version 1 exists, so migration infrastructure is present through Dexie versioning but an old-version migration fixture cannot yet be meaningful.
- Tool read receipts, complete brief/audit/report/patch/guide services, and WebMCP contracts remain for M7.

Verified deployment URL: https://how-i-choose.vercel.app (deployed footer still shows the last release commit until this milestone is pushed).

Current next milestone: M6 — the complete accessible standalone product workflow.

## M6 — Accessible standalone product workflow

Work completed:

- Replaced the scaffold demo with a complete local-first workspace spanning My Signals, Practice Room, What Helps, Rehearsal Audit, Support Guide, History, and Privacy.
- Added owner-controlled onboarding, deterministic sample reset, blank-profile creation, title and rule editing, per-field agent exposure controls, custom signals, and explicit scenario review and approval.
- Added a large semantic signal board, human-only and agent rehearsal modes, visible partner turns, persistent Pause and Stop controls, owner-only resume, and partner-turn blocking in paused or stopped states.
- Added conflict, disclosure, readiness, partner-adherence, support-guide, provenance, activity receipt, and immutable profile-history views.
- Added visible owner ratification, draft watermarks, the required support-guide boundary statement, client-side print, strict JSON import/export, and a copyable ChatGPT starter prompt.
- Added user-controlled text size, high contrast, reduced motion, quiet mode, plain-language mode, skip navigation, status live regions, semantic landmarks, labeled controls, and responsive layouts.
- Kept UI commands and future agent commands on the same application/domain service paths; transient presentation preferences remain outside persisted domain documents.

Validation run:

- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test` passed: 6 files, 48 tests.
- `pnpm test:e2e` passed: 20 tests across desktop and narrow Chromium.
- Product E2E covers owner-controlled onboarding, local profile persistence, human-only validated turns, semantic signals, Pause/Resume/Stop enforcement, blank-profile scenario review, JSON export/import, and accessibility preferences.
- Axe reported zero serious or critical findings on `/` and the populated `/demo/` workspace in desktop and narrow viewports.
- `pnpm build` passed with static `/`, `/demo`, and 404 output.

Remaining risks:

- A manual screen-reader smoke test, forced-colors inspection, 400% reflow inspection, and full keyboard checklist remain release gates; automated keyboard-visible controls and narrow viewport coverage are green.
- Staged protocol-patch review is visible but has no agent-created patch until the WebMCP tool is implemented in M7.
- Support-guide derivation verification and real ChatGPT Site tools discovery remain for M7–M10.

Verified deployment URL: https://how-i-choose.vercel.app (production will be updated to this milestone commit after push).

Current next milestone: M7 — the top-level WebMCP adapter, strict tool contracts, handlers, receipts, and availability state.
