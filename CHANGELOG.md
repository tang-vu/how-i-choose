# Changelog

All notable changes to How I Choose are documented here. The project follows a human-readable variant of Keep a Changelog and has not yet committed to semantic-version compatibility during open alpha.

## [Unreleased]

- Recorded successful discovery of all eight real Site tools and the guarded rehearsal path in ChatGPT's built-in browser on deployed build `d9985080b5ab`.
- Fixed a serious authorization mismatch where the Human-only label did not previously block registered Site tools. Human-only now fails closed for every read and write until the person visibly enables Agent rehearsal; legacy local sessions migrate to the disabled state.
- Added unit, contract, and Playwright regression coverage for the durable access gate. Real ChatGPT then verified the deny/enable path on production build `236b6c4d9b87`.
- Human assistive-technology smoke tests remain to be recorded.
- No stretch features are planned before release evidence is complete.
- Closed the configured coverage gate with focused safety/error-path tests; 73 tests now exceed all global thresholds.
- Updated pnpm and the Node-24 GitHub action, pinned action revisions, and enabled repository vulnerability reporting, alerts/fixes, secret scanning, and push protection.

## [0.1.0] — 2026-08-31

### Added

- Local-first Next.js communication rehearsal workspace with original responsive visual identity.
- Guided onboarding, blank profile, synthetic Maya reset, multiple low-stakes scenarios, profile/rule/signal/disclosure editors, and draft undo.
- Large semantic signal board, human-only and agent practice modes, persistent Pause/Resume/Stop, and live state announcements.
- Pure deterministic protocol engine for structured question count, words, options, channel, defaults, timers, pending signals, rephrasing, conflict precedence, stale revisions, and idempotency.
- Partner-only adherence reports, staged protocol suggestions with provenance and per-item review, and derivation-checked support guides.
- IndexedDB persistence, monotonic ratified history, canonical SHA-256 hashes, JSON import/export, print view, and metadata-only activity receipts.
- Eight imperative top-level WebMCP Site tools with strict closed schemas, capability separation, current-state reads, and visible support status.
- High-contrast, reduced-motion, larger-text, quiet, and plain-language preferences.
- Vitest, fast-check, Testing Library, Playwright, axe, machine-readable agent-flow fixtures, CI, Dependabot, security headers, and release audit scripts.
- Architecture, WebMCP, privacy, security, threat-model, limitations, co-design, accessibility, contribution, roadmap, demo, submission, and judging documentation.

### Safety

- Limited the alpha to self-authored adults and synthetic or low-stakes communication practice.
- Kept signal selection, resume, suggestion review, import/export, and ratification exclusively in visible owner workflows.
- Made silence semantically inert, Stop terminal, private fields structurally absent from agent projections, and agent changes draft-only.

The `v0.1.0` release tag will be created only after the owner confirms the final Devpost submission.
