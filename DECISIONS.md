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

Version checks on 2026-08-30 found TypeScript 7 and ESLint 10 as newest registry majors, but the current Next.js lint stack declared peer support through TypeScript 6 and ESLint 9. Pin TypeScript 6.0.3 and ESLint 9.39.5 until upstream compatibility lands; pin all other current compatible packages in the lockfile. Unsupported peer combinations were rejected even though their version numbers were newer.

## D-014 — Dedicated Playwright port and production output

Serve the static export on port 4173 with `reuseExistingServer: false`. Port 3000 was already occupied by an unrelated local application during the first run, which produced false failures. Reusing an arbitrary existing server was rejected because E2E evidence must belong to this repository's current output.
