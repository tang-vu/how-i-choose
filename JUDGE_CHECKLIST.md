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
- [x] Reset ends at approved `ready`, profile revision 1, session version 1.
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

## Automated quality evidence

- [x] ESLint passes.
- [x] Strict TypeScript passes.
- [x] Unit, service, property, import/export, and agent-flow eval tests pass.
- [x] WebMCP contract tests invoke all handlers without UI and verify registration once.
- [x] Playwright desktop and narrow suites pass.
- [x] Complete 15-step judge path passes in both projects.
- [x] Axe reports no serious or critical findings in tested major states.
- [x] Static production build passes.
- [x] Production dependency audit passes for the M9 release candidate: no known vulnerabilities.
- [x] Secret-pattern scan passes for the M9 release candidate: 99 tracked/untracked release files.
- [ ] GitHub Actions passes for the final commit.

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
- [ ] Final commit deployed and footer SHA matches the remote.
- [ ] `/`, `/demo/`, `robots.txt`, favicon, OG asset, and error page checked in deployed Chromium.
- [ ] Production security headers checked.
- [ ] Offline-after-load behavior checked in deployed Chromium.
- [ ] Latest eligible ChatGPT built-in browser discovers all eight tools — **unverified**.
- [ ] Real ChatGPT completes the critical demo path — **unverified**.

If ChatGPT discovery is unavailable because of client/model/rollout eligibility, record the exact client version, model, timestamp, observed status, and blocker here. The full human-only workflow remains valid, but do not claim real discovery passed.

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

## Release ownership

- [ ] Worktree is clean.
- [ ] Latest local `main` equals `origin/main`.
- [ ] GitHub description and homepage match the release.
- [ ] Submission copy has the final live and authorized video URLs.
- [ ] Owner has explicitly authorized Devpost submission.
- [ ] After confirmed submission only: create the release tag and hold the judged deployment stable.
