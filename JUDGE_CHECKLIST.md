# Judge and release checklist

Last updated: 2026-08-31 (Asia/Saigon)

Unchecked means **unverified**, not failed. Do not convert mocked evidence into a manual pass.

## Submission requirements

- [x] Project was created during the challenge period; preserved public history shows the first repository commit.
- [x] Public repository: https://github.com/tang-vu/how-i-choose
- [x] Root MIT license is present.
- [x] English project and submission materials are prepared.
- [x] Public HTTPS product works without an app account: https://how-i-choose.vercel.app/
- [x] Approximately 2:40 demo script leaves margin below three minutes.
- [ ] Demo video recorded with real tool calls.
- [ ] Video uploaded/published with explicit owner authorization.
- [ ] Devpost entry submitted with explicit owner authorization before Sep 3, 2026, 1:00 PM PDT (Sep 4, 2026, 3:00 AM Asia/Saigon).

## Deterministic demo reset

- [x] `/demo/` provides a one-click reset to the synthetic Maya profile.
- [x] Reset ends at approved `ready`, profile revision 1, session version 1, and fail-closed Human-only access.
- [x] Scenario is low stakes: community-workshop time and reminder method.
- [x] The exact starter prompt is in the product and `DEMO_SCRIPT.md`.
- [x] All challenge names, profiles, events, and screenshots are synthetic.

## Required agent path

- [x] Scoped brief exposes only selected current fields.
- [x] Readiness audit reports requirements, conflicts, disclosure gaps, and approval.
- [x] Agent can start only an already owner-approved scenario.
- [x] Long two-question turn returns exact deterministic violations and is not accepted visibly.
- [x] Repaired one-question turn becomes visible.
- [x] Amber is selected by the person and read exactly as `not_sure` with person authorship.
- [x] Rephrase requires different wording and the same controlled meaning.
- [x] Visible person edit changes text-and-speech to text-only.
- [x] Stale agent write is rejected; a fresh brief enables recovery.
- [x] Red Stop selected by the person makes the session terminal.
- [x] Partner report contains violation, repair, signal, stale-recovery, and Stop evidence.
- [x] Agent suggestion is staged with source-event provenance and an exact diff.
- [x] The person visibly accepts or rejects each suggestion.
- [x] Support guide is derivation-checked at the current revision before visible ratification.
- [x] No WebMCP ratification or signal-selection tool exists.
- [x] Human-only returns `AGENT_ACCESS_DISABLED` for every Site-tool read and write without advancing the session.
- [x] Only the visible owner control can enable Agent rehearsal, producing a new session version.

## Automated quality evidence

- [x] ESLint passes.
- [x] Strict TypeScript passes.
- [x] Unit, service, property, import/export, and agent-flow eval tests pass.
- [x] Coverage gate passes: 76 tests, 89.56% statements, 75.56% branches, 88.93% functions, and 90.78% lines.
- [x] WebMCP contract tests invoke all handlers without UI and verify registration once.
- [x] Playwright desktop and narrow suites pass.
- [x] Complete 15-step judge path passes in both projects.
- [x] Axe reports no serious or critical findings in tested major states.
- [x] Static production build passes.
- [x] Production dependency audit passes: no known vulnerabilities.
- [x] Secret-pattern scan passes for the release candidate: 100 tracked/untracked release files.
- [x] GitHub Actions passes for the final commit at handoff.

## Manual accessibility release record

- [ ] Keyboard-only checklist completed — date/tester/browser: unverified.
- [ ] NVDA + Chrome smoke test completed — date/tester/versions: unverified.
- [ ] 400% zoom/reflow check completed — date/tester/browser: unverified.
- [ ] Windows forced-colors check completed — date/tester/browser: unverified.
- [ ] Reduced-motion check completed — date/tester/browser: unverified.
- [ ] Print/PDF support-guide check completed — date/tester/browser: unverified.

See [ACCESSIBILITY.md](ACCESSIBILITY.md) for the exact steps. Automated keyboard/viewport/media-mode coverage may support these checks but does not mark human assistive-technology items complete.

## Deployment and browser record

- [x] Vercel project is authenticated and the production alias exists.
- [x] Deployment is top-level HTTPS with no iframe wrapper, login, runtime secret, or database.
- [x] Final commit is deployed and the footer SHA matches its remote SHA at handoff.
- [x] `/`, `/demo/`, `robots.txt`, favicon, OG asset, product preview, and error response checked in deployed Chromium.
- [x] Production CSP, frame denial, MIME, permissions, referrer, and HSTS headers checked.
- [x] Human rehearsal remains operational when Chromium is taken offline after static assets load.
- [x] ChatGPT's built-in browser discovered all eight real tools on deployed build `d9985080b5ab` — owner-run 2026-08-31.
- [x] Real tools exercised readiness, stale recovery, idempotency, invalid-turn repair, semantic signal acknowledgment, Pause, Stop, reporting, guide verification, and draft-only patch staging — owner-run 2026-08-31.
- [x] Production build `236b6c4d9b87` rechecked in real ChatGPT: Human-only blocked brief/start with `AGENT_ACCESS_DISABLED` and no changed IDs; visible Agent rehearsal then enabled the 20/20 scoped brief at session v2 — owner-run 2026-08-31.

Evidence record: the owner opened the deployed synthetic demo in ChatGPT's built-in browser on 2026-08-31 and reported eight discovered tools with no application console errors. The first run confirmed readiness, revision/idempotency guards, deterministic rejection and repair, Blue/more-time acknowledgment, Pause/Stop enforcement, partner-only reporting, derived guide content, and staged-only protocol changes. The owner deliberately left the patch pending review and did not accept or ratify it. That run also found that build `d9985080b5ab` treated Human-only as display state rather than authorization. After the fix, the owner tested build `236b6c4d9b87`: reset was Human-only `ready · v1`; `get_rehearsal_brief` and `start_approved_rehearsal` returned `AGENT_ACCESS_DISABLED`, with no changed IDs from start; visible Agent rehearsal enabled access; the next brief returned `OK`, 20/20 shared fields, valid next actions, and `ready · v2`; no application console errors appeared. ChatGPT client/model details were not provided. Human NVDA/screen-reader evidence remains unverified.

## Content and safety review

- [x] Guide includes the exact “Ask me directly whenever possible” boundary.
- [x] Product states that communication difficulty is not inability to decide.
- [x] Product states that silence or delayed response is never agreement.
- [x] Open alpha, not clinically validated, no diagnosis required, and synthetic-data status are visible.
- [x] Scope excludes minors, proxies, emergencies, treatment, contracts, payments, and crisis scenarios.
- [x] Reports have no person/comprehension/capacity/consent/emotion/diagnosis score.
- [x] Privacy copy says IndexedDB is unencrypted and active-agent fields are processed by the agent.
- [x] Compensated co-design and governance plan is documented honestly.
- [x] Final prohibited-claim and forbidden-tool source scan passes; safety phrases appear only as explicit boundaries/limitations, and forbidden names appear only in negative tests/evals.
- [x] Private vulnerability reporting, dependency alerts/automatic fixes, secret scanning, and push protection are enabled on GitHub.

## Release ownership

- [x] Worktree is clean at handoff.
- [x] Latest local `main` equals `origin/main` at handoff.
- [x] GitHub description and homepage match the release.
- [ ] Submission copy has the final live and authorized video URLs.
- [ ] Owner has explicitly authorized Devpost submission.
- [ ] After confirmed submission only: create the release tag and hold the judged deployment stable.
