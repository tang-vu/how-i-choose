# Architecture and product decisions

Updated: 2026-08-31 (Asia/Saigon)

## D-001 — Preserve the existing public history

The repository already existed with a single `.gitattributes` commit created during the challenge period. We kept that commit, changed repository visibility to public, and added the license in a new pushed commit. Rewriting history was rejected because challenge rules value timestamped evidence and the release protocol forbids it.

## D-002 — pnpm and static Next.js App Router

Use pnpm, strict TypeScript, React, and Next.js App Router with static export. The local runtime has current pnpm and Node 24. A backend, server action, account, and remote persistence were rejected because the product must be local-first and work after the static assets load.

## D-003 — Stable WebMCP superset with strict handler guards

Register the eight allowed imperative tools once from a top-level client boundary and enforce state/revision/permission rules inside every invocation. OpenAI documents only a subset of the evolving WebMCP API and does not promise dynamic unregistration. Dynamic lifecycle cleverness was rejected in favor of reliable discovery and identical guards.

Authoritative references:

- OpenAI Site tools: https://learn.chatgpt.com/docs/webmcp
- Chrome WebMCP overview: https://developer.chrome.com/docs/ai/webmcp
- Chrome imperative API: https://developer.chrome.com/docs/ai/webmcp/imperative-api
- WebMCP draft (Community Group Report, 2026-08-26): https://webmachinelearning.github.io/webmcp/

## D-004 — Dexie is durable truth; Zustand is a projection

Use IndexedDB through Dexie for profiles, sessions, immutable ratified snapshots, receipts, and idempotency records. Zustand exposes hydrated read models and transient preferences. A second independently mutable persisted Zustand state was rejected because it creates split-brain state and stale WebMCP reads.

## D-005 — One atomic command path

Both visible human actions and WebMCP calls go through bounded Zod contracts, application services, pure reducers, and a repository transaction. Revisions, idempotency fingerprint, events, and state changes are checked/written atomically. Validation-only UI handlers and direct Dexie/Zustand mutations from WebMCP were rejected.

## D-006 — Structural owner/agent authority separation

Expose a narrow `AgentRehearsalService` to WebMCP and a separate `OwnerWorkflowService` to visible controls. Agent code has no access to ratify, resume, import/export, share, delete, or signal-selection methods. A generic string-dispatched command bus in handlers was rejected because runtime name checks are weaker than capability separation.

## D-007 — Allowlisted disclosure projections

Build an agent-specific DTO from active, disclosed fields only, defaulting to deny. Private notes never enter the DTO. Serializing a full domain record and deleting fields afterward was rejected as leak-prone.

## D-008 — Pure deterministic domain with explicit effects

The domain receives time, IDs, prior state, and structured question segments as inputs; it returns next state, events, and violations. Silence is the absence of an event. Free-text semantic classification was rejected because it cannot support deterministic safety claims.

## D-009 — Canonical hashing preserves meaning

Canonicalization recursively sorts object keys and set-like entity collections by stable ID, while preserving ordered question segments, options, and event histories. Hash the canonical UTF-8 JSON outside pure reducers. Sorting every array was rejected because it can change meaning.

## D-010 — Accessibility claims stay evidence-based

Target WCAG 2.2 AA engineering practices and report concrete automated/manual checks. Do not claim conformance without a complete evaluation. Primary signals, Pause, and Stop use generous targets and visible text; shortcuts are optional and configurable, not the only control.

## D-011 — Honest local-first wording

Describe IndexedDB as local and unencrypted. Explain that fields explicitly marked for agent access are processed by the active agent when Site tools run. “All data stays on device” and “encrypted storage” were rejected as inaccurate.

## D-012 — Low-stakes synthetic scope only

The first release supports self-authored adult profiles and synthetic low-stakes rehearsals. No minors, proxies, clinical decisions, emergencies, legal/financial decisions, crisis handling, or consent/capacity claims. The report evaluates the partner only.

## D-013 — Supported-current versions over unsupported newest majors

Version checks on 2026-08-31 found TypeScript 7 and ESLint 10 as newest registry majors. The current `typescript-eslint` 8.68 peer range requires TypeScript below 6.1, so TypeScript stays at 6.0.3. A controlled ESLint 10.9.1 install passed package resolution but the Next.js React lint plugin crashed while loading `react/display-name`; ESLint therefore stays at the last proven-compatible 9.39.5. Unsupported combinations were rejected based on an actual quality-gate run, not version numbers alone.

## D-014 — Dedicated Playwright port and production output

Serve the static export on port 4173 with `reuseExistingServer: false`. Port 3000 was already occupied by an unrelated local application during the first run, which produced false failures. Reusing an arbitrary existing server was rejected because E2E evidence must belong to this repository's current output.

## D-015 — Verification receipt before visible ratification

Require a successful support-guide derivation receipt for the current profile revision before the owner ratification command can succeed. Both the visible human workflow and the read-only Site tool call the same query service, so the product remains fully usable without WebMCP. A decorative “verified” label with no command guard was rejected because it would not enforce the documented review order.

## D-016 — Judge reset stops at Ready

Reset the synthetic Maya session to `ready`, not `active`. The scenario is already visibly owner-approved, but a human or agent must explicitly start the rehearsal. Auto-starting was rejected because it hides an important owner-controlled state boundary and prevents the `start_approved_rehearsal` tool from being demonstrated honestly.

## D-017 — Separate production, mocked WebMCP, and real ChatGPT evidence

Use a repeatable Playwright production smoke to verify routes, assets, headers, footer SHA, origin isolation, honest unsupported state, and offline-after-load human operation. Keep mocked `document.modelContext` contract/browser results separate from real ChatGPT discovery. Ordinary Chromium cannot substitute for an eligible ChatGPT built-in-browser client, so the final release records that external evidence as unverified instead of weakening or simulating it.

## D-018 — Embed the pushed SHA during deployment

The deploy helper reads the current 12-character Git SHA and passes it as a build-time value. Release order is push, verify remote parity, deploy, then production smoke. Relying on a locally generated `local` label or an implicit hosting-provider Git variable was rejected because judges and maintainers need to match the visible build to public source.

## D-019 — Treat coverage and repository settings as release gates

Keep the configured global coverage thresholds and add tests for uncovered safety/error branches rather than lowering the bar. Use pnpm 11.24.0 and the official Node-24 `pnpm/action-setup@v6`. Enable GitHub private vulnerability reporting, vulnerability alerts, automatic security fixes, secret scanning, and push protection; optional non-provider-pattern and validity checks remain unavailable on the repository's current GitHub feature set and are not claimed.

## D-020 — Treat practice mode as durable authorization

Human-only must mean that the active browser agent cannot read or mutate the rehearsal, not merely that the page renders a different form. Store the owner-controlled `agentAccessEnabled` flag on the revisioned rehearsal session, default and migrate it to false, and make all WebMCP queries fail closed. Mutating services recheck the flag inside the atomic transaction so a UI race cannot authorize a stale call. Keeping mode in React component state or merely renaming the label was rejected because neither enforces the user's stated boundary.
