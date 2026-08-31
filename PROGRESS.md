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

## M7 — Scoped imperative WebMCP tools and staged review

Work completed:

- Added a top-level imperative adapter using `document.modelContext.registerTool()` with feature detection, an iframe guard, a per-document singleton promise for React Strict Mode, and one stable catalog of eight scoped tools.
- Added strict, bounded JSON Schemas with `additionalProperties: false` and matching Zod validation for every input, including nested turn segments, response options, and staged rule proposals.
- Added `get_rehearsal_brief`, `audit_rehearsal_readiness`, `start_approved_rehearsal`, `offer_partner_turn`, `read_latest_signal`, `get_rehearsal_report`, `stage_protocol_patch`, and `verify_support_guide`.
- Made every handler read the current IndexedDB workspace at invocation time. Agent code has no signal-selection, resume, review, ratification, import/export, sharing, contact, assessment, or deletion capability.
- Added metadata-only receipts for read, invalid, rejected, replayed, and successful invocations; full profile, signal, scenario, and turn prose are excluded.
- Added exact person-authored semantic-signal reads, current-revision recovery, deterministic invalid-turn evidence, repaired-violation reporting, and Stop guards that do not advance the stopped session.
- Added provenance-linked staged rule additions/updates with exact before/after data, prospective conflict and coverage checks, and agent-invisible draft defaults.
- Added visible per-item Accept, Reject, and Rewrite-as-mine review. Ratification stays disabled until every staged item is visibly reviewed.
- Added a visible Site tools availability bridge that refreshes the workspace after tool calls without capturing Zustand state.

Validation run:

- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test` passed: 7 files, 55 tests.
- WebMCP contract tests verify exactly-once registration, all eight schemas and handlers, current-state reads, strict bounds, stale recovery, invalid/repair behavior, exact signal authorship, Stop enforcement, staged provenance, metadata-only receipts, and forbidden-tool absence.
- `pnpm test:e2e` passed: 22 tests across desktop and narrow Chromium.
- Browser E2E injects a mock `document.modelContext`, observes eight unique top-level registrations, invokes real page handlers, rejects a long two-question turn, repairs it, and verifies that the accepted turn becomes visible in the Practice Room.
- `pnpm build` passed as part of the Playwright production-server gate; an explicit final milestone build follows immediately before commit.

Remaining risks:

- The imperative API is experimental and the real ChatGPT built-in browser discovery check remains unverified until the final deployed tool build is available.
- The complete 15-step Maya flow, including a mid-session owner profile edit, exact not-sure rephrase, stopped-session debrief, visible patch review, and guide verification, remains for M8.
- Manual assistive-technology checks and release documentation remain outstanding.

Verified deployment URL: https://how-i-choose.vercel.app (currently M6 commit `df5467e`; production will be updated after this M7 commit is pushed).

Current next milestone: M8 — the complete deterministic Maya judge path, eval fixtures, staged review, and full-state E2E coverage.

## M8 — Complete Maya judge path and structured evals

Work completed:

- Changed deterministic judge reset to the approved `ready` state so the person or agent must explicitly start the session.
- Modeled Maya’s initial channel as text and speech, then added a visible owner control that changes the protocol to text-only and increments both profile and session revisions.
- Completed the 15-step agent path: scoped brief, readiness audit, approved start, intentional long two-question rejection, structured repair, visible accepted turn, person-selected amber signal, exact semantic read, meaning-preserving rephrase, owner profile edit, stale write rejection, fresh reread/adaptation, person-selected Stop, blocked later turn, partner-only report, staged improvement, per-item owner review, guide verification, and visible ratification.
- Added report evidence for rule violations, repairs, signal acknowledgment, Stop enforcement, and stale-revision recovery after a fresh brief read. Consumed Pause/Stop signals are treated as visibly enforced rather than unresolved.
- Required a successful support-guide derivation receipt for the current revision before owner ratification. The visible human button and WebMCP tool share the same query service.
- Added three synthetic low-stakes scenario templates that always return to visible owner review, plus a visible one-step undo for draft profile edits through the owner application service.
- Added human-only pending-signal acknowledgment, including a no-question acknowledgment that honors “need more time.”
- Added a 180-day/no-review-date warning for support-guide previews.
- Added eight strict machine-readable agent-flow fixtures covering valid/invalid turns, unsure repair, more time, mid-session revision, Stop, protocol suggestion, and ratification-tool absence.

Validation run:

- `pnpm lint` passed after the final purity correction.
- `pnpm typecheck` passed.
- `pnpm test` passed: 8 files, 61 tests.
- `pnpm test:e2e` passed: 26 tests across desktop and narrow Chromium.
- The complete judge path passed in both viewport projects and axe found zero serious or critical issues in stopped and post-review/ratified states.
- Product E2E additionally covers human-only acknowledgment, multiple scenario templates, draft undo, accessibility preferences, blank review, persistence, import/export, and print-trigger availability.
- `pnpm build` passed as the Playwright production-server prerequisite; an explicit final build follows before commit.

Remaining risks:

- Real ChatGPT built-in browser discovery remains unverified until the M8 deployment is live and can be opened in an eligible desktop client.
- Manual keyboard, screen-reader, forced-colors, reduced-motion, and 400% reflow checklists remain release tasks despite automated coverage.
- Security/privacy documentation, full README, screenshot, submission copy, demo timing, dependency/secret audits, and final remote smoke checks remain for M9–M10.

Verified deployment URL: https://how-i-choose.vercel.app (currently M7 commit `0adae2e`; production will be updated after this M8 commit is pushed).

Current next milestone: M9 — security/privacy hardening, complete documentation, screenshot, release automation, submission copy, and timed demo script.

## M9 — Release hardening, documentation, and submission package

Work completed:

- Added the complete root documentation set: product README, architecture, WebMCP adapter, security policy, privacy model, threat model, limitations, compensated co-design plan, roadmap, contribution guide, accessibility review, changelog, judge checklist, timed demo script, and polished submission copy.
- Captured and visually inspected a synthetic production screenshot at `public/product-preview.png`; the README uses it as the product preview.
- Added a 2:40 demo plan with the exact in-product ChatGPT prompt, action/narration timestamps, recording-integrity rules, and explicit owner-authorization gates for video publication and Devpost submission.
- Added production dependency and tracked/untracked release-file secret scans to local scripts and CI. The secret scan excludes binary assets and records no authored content.
- Added a cross-platform Vercel deploy helper that embeds the current 12-character Git SHA at build time for footer/remote verification.
- Added an explicit Vercel ignore list so generated build, report, coverage, and TypeScript-cache artifacts are not uploaded as deployment source.
- Added automated keyboard activation/skip-link, forced-colors, reduced-motion, 320 CSS pixel reflow, and print support-guide coverage in both Playwright projects.
- Audited registered capabilities, dangerous rendering/network patterns, forbidden tool names, and prohibited positioning phrases. Forbidden capability names occur only in negative tests/evals; sensitive positioning phrases occur only in explicit limitations or safety boundaries.
- Verified GitHub remains public under `tang-vu`, detects the MIT license, uses `main`, and has the expected repository description/homepage.

Validation run:

- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test` passed: 8 files, 61 tests.
- `pnpm test:e2e` passed: 34 tests across desktop and narrow Chromium.
- New release accessibility tests passed in both projects; axe reported zero serious or critical findings in forced-colors/reduced-motion and the complete judge states.
- `pnpm build` passed; `/`, `/_not-found`, and `/demo` were emitted as static routes.
- `pnpm audit:prod` passed with no known vulnerabilities.
- `pnpm audit:secrets` passed across all tracked and untracked release files (100 in the final candidate).
- The deploy helper passed a non-uploading Vercel `--dry` inspection after its Windows command path was corrected; only source inputs remain after the explicit ignore rules.
- `git diff --check` passed; only expected Git line-ending notices were emitted.
- Latest pre-M9 GitHub Actions run for M8 is green; the M9 CI result will be checked after push.

Remaining risks:

- Real ChatGPT built-in browser discovery and the complete real-agent path remain unverified; mocks are not treated as proof.
- Human NVDA/screen-reader and 400% zoom checks remain unverified; the exact manual checklist is published and automated keyboard/media/reflow coverage is green.
- Final production must be deployed from the pushed SHA, then checked for footer parity, headers, offline-after-load behavior, routes/assets, and Chromium behavior.
- Demo video publication and Devpost submission require explicit owner authorization and have not been performed.

Verified deployment URL: https://how-i-choose.vercel.app (currently M8 commit `e346797`; production will be updated after this M9 commit is pushed).

Current next milestone: M10 — final SHA deployment, production/browser audits, repository parity, and honest real-ChatGPT verification status.

## M10 — Production verification and release audit

Work completed:

- Pushed and deployed the M9 release candidate over HTTPS with its 12-character source SHA visible in the footer.
- Added a repeatable production Chromium smoke covering `/`, `/demo/`, the 404 response, robots, favicon, OG image, product preview, security headers, third-party-origin isolation, unsupported Site-tools status, and human rehearsal after the browser goes offline.
- Verified the canonical production alias returns build `38f0ef526c63`, no external origin requests, and no console errors.
- Verified local IndexedDB interaction continues after loaded static assets lose network access: start, valid partner turn, person-selected more-time signal, and explicit human acknowledgment all complete offline.
- Investigated the M9 GitHub Actions failure instead of treating local parallel results as sufficient. Linux Chromium exposed 9 pixels of narrow-header overflow and two retry races.
- Fixed the 320px header to wrap its Site-tools status, made the channel editor unavailable during an in-flight owner command, and made onboarding/reset waits deterministic. A CI-mode, one-worker rerun passed all 24 affected desktop/narrow tests without retries.
- The next remote run isolated a final 5-pixel CI-only overflow: GitHub injected its full 40-character SHA while local/production used the intended short label. Build metadata now normalizes every provider SHA to 12 characters, matching the verified production footer and preventing the unbreakable CI-only string.
- Reproduced the release in the matching Playwright Linux container with a full 40-character `GITHUB_SHA`; both 320px viewport projects pass after normalization. The complete one-worker local CI simulation also passes all 34 tests with that full environment value.
- Confirmed GitHub repository visibility, MIT detection, description, homepage, default branch, and remote ownership.
- Recorded the exact external ChatGPT blocker: no eligible built-in-browser client/model session is available in this execution environment. Standard Chromium correctly reports Site tools unavailable; real ChatGPT discovery and the real-agent path remain unverified.

Validation run:

- Production deployment `dpl_33tiorQTSLBkXXMEpYyVhDhNuEzX` reached READY and was aliased to https://how-i-choose.vercel.app.
- `pnpm smoke:prod` passed against the canonical URL for build `38f0ef526c63`.
- Production CSP, HSTS, frame denial, MIME, permissions, and referrer headers passed assertions.
- Production root, demo, robots, favicon, OG image, product preview, and missing-route response passed.
- CI-mode targeted Playwright passed: 24 tests, one worker, desktop and narrow, no retries.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` passed after integration: 8 files and 61 tests.
- Full Playwright passed in CI mode with one worker: 34 tests across desktop and narrow Chromium, no retries.
- Explicit `pnpm build` passed with all three static routes.
- Production dependency audit again reported no known vulnerabilities; the secret scan passed all 100 release files.
- Final source-SHA deployment and its matching production smoke follow immediately after this release-verification commit is pushed.

Remaining risks and manual actions:

- Real ChatGPT discovery and the real-agent demo require the owner to open the production `/demo/` URL in an eligible ChatGPT built-in browser/model and follow `DEMO_SCRIPT.md`.
- Human NVDA/screen-reader and 400% browser-zoom checks remain unverified; automated axe, keyboard, forced-colors, reduced-motion, print, and 320px checks are green.
- Recording/publishing the video and submitting Devpost remain prohibited until explicit owner authorization.
- Do not create the `v0.1.0` tag or freeze the judged deployment until the owner confirms submission.

Verified deployment URL: https://how-i-choose.vercel.app

Current next action: run final gates, push the release-verification commit, deploy that exact SHA, verify production/CI parity, then hand off only the manual ChatGPT, assistive-technology, video, and submission actions.

## M11 — Automated closeout and repository security

Work completed:

- Found that the existing coverage command failed despite all tests passing because branch coverage was 71.74% against the configured 75% threshold.
- Added focused tests for global/context rules, contradictory effects, policy dominance, canonicalization fallbacks, hidden agent projections, report evidence, malformed/oversized imports, and unavailable WebMCP registration. Runtime behavior was unchanged.
- Updated pnpm from 11.20.0 to 11.24.0 and the official GitHub setup action from v4 to its Node-24 v6 release.
- Enabled GitHub Actions update monitoring, accepted the latest CI-verified checkout 7.0.1, setup-node 7.0.0, and pnpm setup revisions, and ignored only the demonstrated-incompatible ESLint/TypeScript major lines.
- Trialed current ESLint 10.9.1, reproduced an incompatibility crash in the Next.js React lint plugin, and restored the proven-compatible ESLint 9.39.5. `pnpm peers check` is clean after restoration; TypeScript remains 6.0.3 because `typescript-eslint` requires `<6.1`.
- Enabled GitHub private vulnerability reporting, vulnerability alerts, automatic security fixes, secret scanning, and push protection. Optional non-provider-pattern and validity checks were not available in the current repository feature set and remain explicitly unclaimed.
- Rechecked the host for an eligible ChatGPT desktop/built-in-browser session and NVDA installation; neither is available, so those manual checks remain external rather than fabricated.

Validation run:

- `pnpm test:coverage` passed: 8 files, 73 tests; 89.81% statements, 75.12% branches, 89.01% functions, and 90.89% lines.
- `pnpm peers check` passed with no peer dependency issues.
- `pnpm lint` passed after the compatibility-tested toolchain was restored.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` passed; the unit suite contains 73 tests.
- `pnpm build` passed with static `/`, `/_not-found`, and `/demo` routes.
- CI-mode `pnpm test:e2e` passed all 34 desktop/narrow Chromium tests with one worker, including axe, keyboard, forced-colors, reduced-motion, 320px reflow, print, WebMCP, and the complete Maya path.
- Production audit reported no known vulnerabilities; the secret scan passed all 100 release files.
- Deployment, production smoke, GitHub Actions, and remote-parity checks follow for this final closeout commit.

Remaining risks and manual actions:

- Real ChatGPT discovery and the real-agent demo still require the owner to use an eligible ChatGPT built-in browser/model.
- Human screen-reader and 400% browser-zoom checks remain unverified; the published checklist and automated accessibility/reflow evidence are ready for a human tester.
- Recording or publishing a video and submitting Devpost still require explicit owner authorization.
- The release tag remains intentionally deferred until the owner confirms submission.

Verified deployment URL: https://how-i-choose.vercel.app (currently build `82510d711fa1`; this closeout commit will replace it after push and exact-SHA verification).

Current next action: push this final automated closeout, deploy and smoke-test its exact SHA, confirm GitHub Actions and remote parity, then hand off only the external/manual actions above.

## M12 — Real ChatGPT evidence and Human-only authorization

Work completed:

- Recorded the owner's real ChatGPT built-in-browser run against deployed build `d9985080b5ab`: all eight top-level Site tools were discovered, the guarded agent path worked through draft patch staging, and no application console errors were observed.
- Kept the evidence precise: the patch remained pending owner review and was neither accepted nor ratified; client/model details were not provided.
- Classified the run's Human-only finding as an authorization defect. The mode had lived only in React state, so handlers could still read and mutate durable rehearsal state.
- Replaced display-only mode with a durable, owner-controlled `agentAccessEnabled` session permission. Judge reset, blank data, and migrated legacy sessions fail closed to Human-only.
- Added a visible owner-only toggle that increments `sessionVersion`. WebMCP reads check current IndexedDB state; mutations are blocked before dispatch and rechecked inside the atomic service transaction. Human-only practice continues through the separate `owner_ui` capability.
- Added unit compatibility coverage, handler contract coverage for all-side-effect denial, and Playwright coverage that proves denial before visible enablement and the complete post-enable judge path.

Validation run:

- `pnpm lint` and `pnpm typecheck` passed.
- `pnpm test` passed: 8 files and 76 tests.
- `pnpm test:coverage` passed: 89.56% statements, 75.56% branches, 88.93% functions, and 90.78% lines.
- Targeted desktop Playwright passed both the complete synthetic judge path and WebMCP registration/authorization path: 2 tests, one worker.
- Full Playwright passed all 34 desktop/narrow tests with one worker and no retries, including axe, keyboard, forced-colors, reduced-motion, print, 320px reflow, Human-only authorization, and the complete judge path.
- The production static build passed for `/`, `/_not-found`, and `/demo`.
- Production dependency audit found no known vulnerabilities; peer dependency checks passed; secret scanning passed across all 100 release files.
- Final post-edit lint, typecheck, unit, coverage, build, full E2E, audit, secret, peer, forbidden-capability, unsafe-rendering, and `git diff --check` gates passed.
- Pushed implementation commit `2997dd4e7e23875b76b5550cd995b8c7c5135b22` to `origin/main` and verified exact remote parity.
- Vercel deployment `dpl_2d6xKbWbJ4hQQXTtjr67yCAo1Vo2` reached READY and the canonical production alias served build `2997dd4e7e23`.
- `pnpm smoke:prod` passed production routes/assets, security headers, zero third-party origins, footer SHA, unavailable-browser fallback, and offline-after-load human operation.
- GitHub Actions quality run `33357144454` passed install, dependency/secret audits, lint, typecheck, unit tests, build, and full Playwright for the same implementation SHA in 2m05s.
- Documentation closeout commit `1dc7f9da603efe5c1b4ea3ad5ba426cc9816770f` then passed the same local gates and GitHub Actions run `33357450603`; Vercel deployment `dpl_F5ZFEfNBiiLmAifrcXsKctNP53wg` served its matching footer SHA and passed production smoke.

Remaining risks and manual actions:

- Post-fix real ChatGPT authorization verification passed on production build `236b6c4d9b87`: Human-only blocked brief/start without changed IDs; visible Agent rehearsal then enabled an `OK` brief with 20/20 shared fields and advanced only the owner-controlled session version from 1 to 2.
- Human screen-reader and 400% zoom checks remain unverified.
- Video publication, Devpost submission, and the post-submission release tag still require explicit owner authorization.

Verified deployment URL: https://how-i-choose.vercel.app

Current next action: complete any desired human assistive-technology checks, then explicitly authorize video publication and Devpost submission when ready. No agent-controlled implementation, deployment, automated validation, or real-WebMCP verification task remains open.

## M13 — Judge-facing product clarity and visual distinction

Work completed:

- Re-audited the public landing page and synthetic Practice Room at desktop and mobile sizes against the official challenge's equally weighted WebMCP leverage, execution, potential-impact, and creativity/ambition criteria.
- Replaced inert landing navigation with links to the corresponding real workspace sections and changed `Create a blank profile` from a showcase scroll into a real direct-start blank local workflow.
- Added a person-centered signal orbit, literal proof strip, and four-step executable-protocol story so the product inversion and WebMCP role are understandable in the first screen.
- Added a dynamic Define/Approve/Rehearse/Reflect rail to the workspace and reinforced the signal board with text-plus-shape semantics.
- Reframed the Practice Room around a visible protocol-checked partner turn, current rehearsal protections, a scoped `MAY`/`NEVER` agent authority boundary, and the one-paste ChatGPT demo prompt.
- Refreshed and visually inspected `public/product-preview.png`; no real person or private information is present.
- Extended regression coverage for the direct-start CTA, real navigation, narrow landing reflow, and the refreshed Agent rehearsal state under forced colors.
- The first full E2E run exposed insufficient forced-colors contrast in the new protection strip. The palette override and selector specificity were corrected, the Agent boundary was added to the forced-colors axe state, and the complete suite was rerun rather than skipped.

Validation run:

- Desktop and mobile landing screenshots and the refreshed Practice Room preview were visually inspected; temporary audit captures were removed after review.
- `pnpm lint` and `pnpm typecheck` passed.
- `pnpm test` passed: 8 files and 76 tests.
- `pnpm build` passed with static `/`, `/_not-found`, and `/demo` routes.
- CI-mode `pnpm test:e2e` passed all 36 desktop/narrow Chromium tests with one worker and no retries after the accessibility repair. The suite includes the complete judge path, landing CTA/navigation/reflow, Agent rehearsal forced-colors/reduced-motion axe checks, print, keyboard, persistence, and WebMCP registration.
- Axe reported zero serious or critical findings in all tested release states.
- Production dependency audit found no known vulnerabilities; peer dependency checks passed; secret scanning passed across all 100 release files.
- Pushed implementation commit `e59970a922659134a5d4cabeb2ee478f4b70b7c7` to `origin/main` and verified exact remote parity.
- Vercel deployment `dpl_C4irayRr1zHbk8ugJvZgg1gr5ecs` reached READY; the canonical production alias served footer build `e59970a92265`.
- `pnpm smoke:prod` passed all production routes/assets, security headers, zero third-party origins, honest unavailable-browser status, and the offline-after-load human workflow.
- GitHub Actions quality run `33366535531` passed install, dependency/secret audits, lint, typecheck, 76 unit tests, build, and all 36 Playwright tests for the same implementation SHA in 2m21s.

Remaining risks and manual actions:

- Human screen-reader and 400% zoom checks remain unverified; automated keyboard, 320 CSS-pixel reflow, forced-colors, reduced-motion, and axe evidence is green.
- Video recording/publication and Devpost submission still require explicit owner authorization. The release tag remains deferred until submission is confirmed.

Verified deployment URL: https://how-i-choose.vercel.app (implementation build `e59970a92265`).

Current next action: push this documentation closeout, deploy its exact docs-only SHA for footer parity, then leave only the human assistive-technology, authorized video, Devpost submission, and post-submission tag actions.
