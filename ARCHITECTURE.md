# Architecture

## Goals

How I Choose must remain useful offline after static assets load, keep the person as the source of truth, evaluate only the communication partner, and give WebMCP no authority unavailable in its narrow service boundary.

## Runtime layers

```text
src/app + src/components
        │ visible commands / top-level registration
        v
src/application
        │ validated use cases and capability separation
        v
src/domain + src/machine
        │ pure deterministic rules and legal transitions
        v
src/persistence
        │ revision-checked Dexie transactions
        v
IndexedDB

src/state reads a hydrated projection; it is not a second database.
src/webmcp adapts browser calls to application services; it owns no domain rules.
```

## Durable model

`CommunicationProfile`, `Scenario`, and `RehearsalSession` are strict schema-versioned documents with bounded entity counts, stable IDs, monotonic revisions, and ISO timestamps. Ratification creates an immutable `ProfileVersionRecord` containing the canonical SHA-256 hash and complete accepted profile snapshot.

Rehearsal events use tagged unions. Question segments are structured arrays, so question count does not depend on a language model. Silence is the absence of an event.

## Command flow

1. UI or WebMCP input is parsed by a strict Zod schema.
2. `prepareAtomicRequest` fingerprints the payload and attaches correlation metadata.
3. the repository opens one Dexie read/write transaction;
4. current profile and session revisions are compared inside that transaction;
5. idempotency replay is resolved before mutation;
6. an application service calls pure domain validation and state transitions;
7. all next documents are parsed before any write commits;
8. the transaction stores documents, idempotency result, immutable history when applicable, and a sanitized receipt;
9. Zustand refreshes from durable state for rendering.

Rejected content turns may append a non-visible `partner_turn_rejected` adherence event while returning `ok: false`. Paused/stopped calls do not advance the session.

## Authority boundaries

`OwnerWorkflowService` contains visible owner-only actions: selecting signals, resuming, scenario approval, suggestion review, import-adjacent workflows, undo, and ratification. `AgentRehearsalService`, `ProposalService`, and `RehearsalQueryService` expose only the allowed agent capabilities. WebMCP does not instantiate the owner service.

The support-guide verifier is shared by an owner UI button and the read-only WebMCP tool. Ratification checks for a successful verification receipt at the current profile revision and for zero unreviewed agent suggestions.

## Privacy projection

`buildAgentProfileProjection` starts from an allowlist. A field appears only when both the entity and its matching disclosure allow access. It returns active rules for the current context, selected signals, the current context, and scenario summary. `privateNotes` is not part of the DTO type and cannot be serialized by tool handlers.

## Determinism and precedence

- draft and retired rules do not affect evaluation;
- hard block/avoid boundaries outrank preferences;
- equal-strength contradictions are surfaced;
- one-question, word, option, channel, default, and timer checks use controlled values;
- pending semantic signals constrain legal turns;
- advisory language lint is explicitly non-authoritative;
- identical inputs produce identical pure-domain output.

Canonicalization sorts object keys and set-like ID collections while preserving ordered turns, options, and event histories.

## Static deployment

Next.js emits `/`, `/demo/`, and the error page to `out/`. There are no server actions, API routes, accounts, remote persistence, or runtime secrets. Vercel supplies HTTPS and headers; the product can be hosted by any equivalent static HTTPS service.

## Testing boundaries

- Vitest: schemas, reducers, transactions, import/export, service authority, WebMCP contracts, and fast-check properties.
- Playwright: production static build, desktop/narrow UI, IndexedDB persistence, mocked `document.modelContext`, complete judge flow, print trigger, and axe.
- Manual: keyboard, screen reader, forced colors, reflow, deployed Chromium, and eligible ChatGPT discovery.
