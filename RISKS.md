# Risk register

Updated: 2026-08-31 (Asia/Saigon)

| Risk | Likelihood / impact | Mitigation and release evidence | Status |
| --- | --- | --- | --- |
| Experimental WebMCP API changes | High / High | Isolate declarations and adapter; use documented imperative top-level registration; stable superset; bounded contract tests; cite the exact draft date. | Current official sources recorded; core mitigation and contract tests green |
| Real ChatGPT discovery failure | Medium / High | Deploy HTTPS top-level page; use current eligible ChatGPT desktop app and Sol/Terra; show honest status; keep full human workflow; label discovery unverified until a real smoke test. | Open, unverified |
| Sensitive-data exposure | Medium / Critical | Deny-by-default allowlisted DTOs, per-field disclosure, private-notes type boundary, metadata-only receipts, no full-object serialization, projection property tests. | Mitigation implemented; projection/receipt/security release tests green |
| Accessibility regression | Medium / Critical | Semantic native controls, persistent Pause/Stop, axe per major state, keyboard/narrow/reduced-motion/forced-colors tests, manual screen-reader checklist, no conformance overclaim. | Automated major-state checks green; manual checklist pending |
| Medical, legal, consent, or capacity overclaim | Medium / Critical | Locked safety copy, prohibited-claim search, exact support-guide disclaimer, report schema excludes person scoring, docs review before release. | Release copy audited; prohibited phrases occur only in explicit negative boundaries |
| Lack of disabled-user co-design | Certain / High | State the limitation prominently; do not claim validation; publish a concrete future plan for compensated participation, accessibility research, governance, and organizational/healthcare gates. | Accepted alpha limitation |
| Deployment failure | Medium / High | Static export, no secrets/runtime backend, deploy early to authenticated free Vercel, production-output smoke, direct `/demo` test, fallback host only if already available. | Existing production healthy; final SHA deployment and smoke pending M10 |
| Scope expansion | High / High | Enforce cut lines in `PLAN.md`; complete judged core before any stretch; reject accounts, sync, medical, audio, crisis, payment, i18n, PWA, and embedded-model work. | Controlled |
| Deadline compression | High / High | Atomic vertical milestones, deploy early, parallel independent review, cut decoration before safety/test depth, keep submission assets on critical path. | Open |
| Split durable/UI state | Medium / High | Dexie is canonical; Zustand only projections/transient UI; shared services and hydration tests. | Core mitigation implemented |
| Stale or partial mutations | Medium / Critical | Recheck revisions and idempotency inside one transaction; original-result replay; failure injection and race tests. | Core mitigation and complete judge recovery path tested |
| Canonical hash drift | Medium / High | Explicit canonicalization contract, stable IDs, ordered-array allowlist, import/export property tests, immutable ratified snapshots. | Core mitigation implemented and tested |
| Tool poisoning or output injection | Medium / High | Treat site definitions/results and user strings as untrusted; exact schemas plus Zod; no HTML injection, imported code, arbitrary URLs, or overly broad parameters. | Structural mitigations implemented; source and contract audits green |
| Receipts leak authored text | Low / High | Receipt schema contains tool, timing, codes, versions, correlation/changed IDs only; snapshot and property tests. | Implemented and tested |
| Mocked tests mistaken for integration proof | Medium / High | Separate mocked WebMCP, Chrome, and real ChatGPT evidence in progress/release docs; never fabricate a pass. | Mocked browser green; real ChatGPT remains explicitly unverified |
| Dependency or supply-chain vulnerability | Medium / High | Pin lockfile, minimal dependencies, Dependabot, audit and secret scan at release, no runtime third-party scripts/fonts. | Production audit reports no known vulnerabilities; 98-file secret scan green; CI automation enabled |
