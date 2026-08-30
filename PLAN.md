# Delivery plan

Updated: 2026-08-31 (Asia/Saigon)

The challenge deadline is September 3, 2026 at 1:00 p.m. PDT, which is September 4, 2026 at 3:00 a.m. in Asia/Saigon. Judging access must remain available through September 21, 2026.

## Milestones

- [x] M0 — Verify repository ownership, GitHub access, runtime, package managers, deployment access, and authoritative challenge/WebMCP requirements.
  - Validation: authenticated owner is `tang-vu`; Node 24.14.1 and pnpm 11.20.0 available; ChatGPT imperative top-level requirement confirmed from official docs.
- [x] M1 — Make the existing repository public and push a root MIT license.
  - Validation: public GitHub repository; clean local/remote `main`; commit `9c2f70b`.
- [x] M2 — Record the product contract, delivery plan, decisions, progress, and risks.
  - Validation: required five root documents exist, cross-check the brief, `git diff --check`, push verified.
- [x] M3 — Scaffold pinned Next.js App Router, Tailwind, TypeScript, testing, CI, static-export, local assets, metadata, and preview deployment.
  - Dependencies: M2; authenticated free Vercel account.
  - Validation: install, lint, typecheck, unit smoke, E2E smoke, static build, direct `/demo` route, HTTPS preview.
- [x] M4 — Implement schemas, pure rehearsal state machine, canonicalization/hash, policy/conflict/turn/report engines, and fixtures.
  - Validation: table and fast-check properties cover determinism, rule ordering, conflicts, signals, stop/pause, revisions, and hashes.
- [x] M5 — Implement transactional repositories, immutable version history, safe import/export, owner/agent application services, idempotency, and hydrated projections.
  - Dependencies: M4.
  - Validation: fake IndexedDB and real Chromium persistence/migration tests; stale races, replay, rollback, and private projection tests.
- [ ] M6 — Build the accessible standalone product: onboarding, My Signals, custom signals, What Helps, Practice Room, Audit, Support Guide, History, Privacy, human mode, responsive preferences, print, and demo reset.
  - Dependencies: M5.
  - Validation: keyboard flows, narrow/wide viewports, forced colors, reduced motion, persistent Pause/Stop, axe major states, production build.
- [ ] M7 — Add the top-level WebMCP stable tool catalog, runtime validation, fresh-state handlers, metadata receipts, visible availability, and all seven allowed tools.
  - Dependencies: M5–M6.
  - Validation: mocked `document.modelContext`, exactly-once registration, schema bounds, every handler headless, current-state reads, forbidden-tool absence, stop/pause/stale guards.
- [ ] M8 — Complete the deterministic Maya judge path, staged patch review, derivation-checked support guide, adherence report, eval fixtures, and complete E2E suite.
  - Dependencies: M6–M7.
  - Validation: the 15-step critical path runs through mocked tools; no person scores; direct owner controls work; all gates green.
- [ ] M9 — Harden security/privacy, dependency/update automation, CSP/headers, secret and dependency scanning, release documentation, screenshots, submission copy, and demo script.
  - Validation: audit results recorded, prohibited-claim search clean, docs complete, demo timed under three minutes.
- [ ] M10 — Deploy production, update repository metadata, smoke-test Chromium and the latest eligible ChatGPT built-in browser, and run the final release audit.
  - Validation: live HTTPS URL works without login; `/demo` resets; source link and build SHA display; remote equals local; ChatGPT discovery verified or precisely marked unverified.

## Required validation gates

- Every normal milestone: targeted checks, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `git diff --check`.
- UI, WebMCP, product, release, and docs: add `pnpm test:e2e` and `pnpm build`.
- Major states: axe serious/critical count is zero, followed by manual keyboard and screen-reader smoke checks.
- Release: dependency audit, secret scan, forbidden-tool and prohibited-claim searches, exported-site smoke, repository/license visibility, deployment SHA, and remote parity.

## Critical demo path

1. Reset `/demo` to the clearly labeled synthetic Maya profile and approved community-workshop scenario.
2. ChatGPT reads the scoped brief, then audits readiness.
3. One intentionally long two-question turn is rejected with exact rule IDs and repair guidance.
4. A repaired one-question turn appears in the Practice Room.
5. Maya's owner selects amber on the page; the agent reads the exact unconsumed signal and rephrases without changing meaning.
6. The owner changes text-and-speech to text-only; a stale agent write fails; the agent rereads and adapts.
7. The owner selects Stop; later turns are blocked.
8. The report evaluates partner adherence, not the person.
9. The agent stages one provenance-linked improvement; the owner accepts/rejects it visibly.
10. The support guide is derivation-checked before visible owner ratification.

## Dependencies and cut lines

The judged core is the deterministic human workflow plus the seven scoped WebMCP tools, accessibility, privacy, tests, deployment, and submission materials. If schedule pressure appears, first cut decorative illustration, optional Radix dependencies, nonessential charts, and any stretch enhancement. Do not cut human-only practice, owner-controlled signals/pause/stop/ratification, revision and idempotency guards, private projections, support-guide disclaimer, core accessibility, contract tests, production deployment, or honest ChatGPT verification status. Accounts, sync, collaboration, health integrations, speech/audio, emotion detection, crisis features, payments, organization features, i18n, encrypted vault, PWA, embedded models, and general chat are out of scope.
