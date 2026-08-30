# WebMCP implementation

## Compatibility basis

The adapter follows the imperative API currently documented by:

- OpenAI Site tools: https://learn.chatgpt.com/docs/webmcp
- Chrome WebMCP overview: https://developer.chrome.com/docs/ai/webmcp
- Chrome imperative API: https://developer.chrome.com/docs/ai/webmcp/imperative-api
- WebMCP Community Group draft dated 2026-08-26: https://webmachinelearning.github.io/webmcp/

Current ChatGPT documentation requires imperative registration from the top-level page. Declarative tools and tools registered inside iframes are not currently discovered. The API is experimental and is isolated in `src/types/webmcp.d.ts` and `src/webmcp/registry.ts`.

## Registration

`WebMcpBridge` mounts on `/demo/`. `registerHowIChooseTools(document)`:

- feature-detects `document.modelContext.registerTool`;
- rejects non-top-level documents;
- uses a `WeakMap<Document, Promise<boolean>>` singleton guard;
- registers a stable superset exactly once;
- supplies bounded JSON Schema and accurate read-only/idempotent/non-destructive/closed-world annotations;
- constructs handlers that read IndexedDB during each execution;
- notifies the visible app to refresh only after an invocation completes.

Stable registration was chosen over dynamic unregistration because current discovery reliability matters more than state-dependent catalog cleverness. Identical state guards remain inside every handler.

## Contracts

Every object schema sets `additionalProperties: false`. Strings, IDs, arrays, entity counts, timers, revisions, enums, and rationale fields are bounded. Zod parses the same inputs again before application code runs.

Mutating inputs require `expectedProfileRevision`, `expectedSessionVersion`, and `idempotencyKey`. The common result envelope contains:

```text
ok, code, profileRevision, sessionVersion, profileHash,
receiptId, data, violations, changedIds, nextActions
```

Representative codes include `AGENT_ACCESS_DISABLED`, `FIELD_NOT_SHARED`, `OWNER_REVIEW_REQUIRED`, `INVALID_PARTNER_TURN`, `STALE_PROFILE_REVISION`, `STALE_SESSION_VERSION`, `SESSION_PAUSED`, `SESSION_STOPPED`, `PENDING_SIGNAL_UNACKNOWLEDGED`, `IDEMPOTENT_REPLAY`, and `TOOL_NOT_AVAILABLE_IN_STATE`.

## Tools

### `get_rehearsal_brief`

Returns only the current disclosed projection, profile revision/hash, session state/version, scenario, privacy count, pending-signal status, and valid next actions. Hidden fields become `null` or are omitted; private notes are structurally impossible.

### `audit_rehearsal_readiness`

Requires expected profile revision and scenario ID. Returns deterministic required-signal/rule coverage, active conflicts, disclosure gaps, visible review status, and whether agent start is legal.

### `start_approved_rehearsal`

Requires current revisions, scenario ID, and idempotency key. It starts only `ready` sessions whose scenario already has visible owner approval.

### `offer_partner_turn`

Accepts tagged statement/question segments, intent tags, uniform response option objects, channel, optional timer, optional signal acknowledgment ID, meaning key, and rationale. It never uses a free-text semantic classifier.

Invalid content stays out of the accepted turn list, returns exact codes/rule IDs/repair directions, records a failed receipt, and stores non-visible adherence evidence only while the session is active. A valid repair may reference that evidence in the partner report.

### `read_latest_signal`

Returns the latest unconsumed, unacknowledged semantic event selected through visible controls, but only when its definition is shared. The result labels authorship as `person`; it never infers from delay, silence, speech, or behavior.

### `get_rehearsal_report`

Returns partner adherence, evidence IDs, repaired violations, unresolved signals, Stop/Pause handling, and receipt IDs for stale-revision recovery. It exposes no person score.

### `stage_protocol_patch`

Available in debrief. It validates source event IDs and targets, adds agent-invisible draft rules with session/patch/event provenance, returns exact before/after fields, and evaluates prospective conflicts/coverage. It cannot review or ratify the draft.

### `verify_support_guide`

Returns active source rule IDs, signal source IDs, omitted rules, unattributed/inferred statements, current/ratified revision comparison, required boundary wording, derivation validity, and draft-watermark requirement. Its successful receipt enables the separate visible ratification workflow at that revision.

## Activity receipts

Every invocation stores tool name, source, start/end/duration, result code, profile/session versions, changed IDs, and correlation ID. Inputs and output prose are not stored in receipts.

## Tests and real discovery

`src/webmcp/webmcp.test.ts` executes all handlers headlessly and verifies registration once, strict nested schemas, current-state reads, stale recovery, Stop, provenance, receipt privacy, and forbidden-tool absence. `e2e/webmcp.spec.ts` injects a browser `document.modelContext` and invokes registered page tools. `e2e/judge-path.spec.ts` completes the full owner/agent flow.

These mocked tests prove the page integration but do not prove discovery in ChatGPT's built-in browser. That manual check must be recorded honestly in `JUDGE_CHECKLIST.md`.
