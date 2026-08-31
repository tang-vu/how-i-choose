# How I Choose contributor contract

How I Choose is a local-first communication rehearsal workspace. The product evaluates whether a communication partner followed a person's self-authored protocol. It never evaluates the person.

## Repository map

- `src/app`: Next.js App Router routes, metadata, and top-level client boundaries.
- `src/components`: accessible product UI grouped by workflow.
- `src/domain`: browser-independent schemas, reducers, validators, canonicalization, policy, conflict, transition, and report logic.
- `src/application`: the only command path used by both the human UI and WebMCP handlers.
- `src/machine`: explicit rehearsal state-machine definitions.
- `src/state`: hydrated read models and transient UI preferences; never the durable source of truth.
- `src/persistence`: Dexie repositories, migrations, version snapshots, and safe import/export.
- `src/webmcp`: experimental browser declaration, contracts, adapter, handlers, tool catalog, and metadata-only receipts.
- `src/fixtures` and `src/evals`: synthetic demo data and machine-readable agent-flow cases.
- `tests` and `e2e`: integration, contract, accessibility, and Playwright suites.
- `public`: local static assets only.

## Commands

Use pnpm consistently. Exact dependencies are pinned by `pnpm-lock.yaml`.

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:watch
pnpm test:e2e
pnpm test:e2e:ui
pnpm build
pnpm start:static
pnpm audit:prod
pnpm audit:secrets
pnpm capture:preview
pnpm smoke:a11y-assisted
pnpm smoke:prod
pnpm deploy
```

`pnpm capture:preview` refreshes the synthetic public screenshot from the deployed demo. On Windows, `pnpm smoke:a11y-assisted [url] [temporary-artifact-directory]` drives installed Chrome through real 400% browser zoom, captures OS-window evidence, and exercises the critical keyboard/screen-reader states; run it with NVDA active when collecting real assistive-technology output. `pnpm deploy` targets the configured free HTTPS host and embeds the current Git SHA in the build footer. Never purchase a plan or domain. The deploy command must not be used without authenticated hosting access.

## Architectural boundaries

1. `src/domain` is pure TypeScript: no DOM, React, Zustand, Dexie, current time, random IDs, network, or browser crypto. Inject time and identifiers.
2. UI and WebMCP both validate a command, call the same application service, execute the same pure domain logic, and persist through one repository transaction.
3. Dexie is durable truth. Zustand contains observable projections and transient UI state only.
4. Compare-and-swap revision checks, idempotency fingerprint checks, events, and state writes occur atomically in one transaction.
5. `AgentRehearsalService` is narrow and physically excludes owner-only ratification, import/export, share, delete, and resume operations. `OwnerWorkflowService` is separate.
6. Agent projections use allowlisted DTOs with deny-by-default disclosure checks. Never serialize a full profile and remove fields afterward.
7. Ratified snapshots are immutable. Canonical hashes sort object keys and set-like entities but preserve ordered segments, options, and event history.
8. Browser-specific WebMCP behavior lives behind one client-only adapter. Do not reference `document` during SSR or static export.

## Coding conventions

- TypeScript is strict; avoid `any`, unchecked casts, and non-null assertions.
- Zod validates every persisted document, import, command, and tool input at runtime.
- Keep schemas bounded: strings, arrays, entity counts, and enums all have explicit limits.
- Prefer tagged unions, exhaustive switches, stable IDs, monotonic revisions, and explicit result envelopes.
- Render text through React. Never use `dangerouslySetInnerHTML`, imported code, arbitrary URL fetches, or string-built commands.
- User-authored and agent-authored content must retain provenance.
- Challenge fixtures and personas must be visibly labeled synthetic.

## Accessibility requirements

Target WCAG 2.2 AA engineering practices without claiming audited conformance. Use semantic landmarks, logical headings, native controls, visible focus, skip links, text labels, non-color meaning, and 44-by-44-pixel primary targets. Every workflow must work by keyboard. Keep Pause and Stop persistent and immediately effective. Use polite status regions for ordinary updates and assertive alerts only for urgent failures and Stop. Honor reduced motion and forced colors; support text size, high contrast, Quiet mode, and Plain language mode. Do not use timers, auto-advance, gesture-only actions, disappearing alerts, or unconfigurable single-character shortcuts. Run axe plus manual keyboard, zoom/reflow, forced-colors, and screen-reader smoke checks.

## Security and privacy constraints

- No backend, account, remote database, analytics, advertising, trackers, external model calls, runtime fonts, or hidden telemetry.
- IndexedDB storage is local and unencrypted. Never describe it as encrypted or claim all data remains on-device while Site tools are active.
- Private notes are structurally unavailable to WebMCP. Receipts contain metadata and identifiers, never full profile or rehearsal text.
- Explain that explicitly shared fields are processed by the active browser agent.
- No real personal information in fixtures. No minors, proxies, emergencies, healthcare decisions, contracts, payments, crisis scenarios, or substituted decision-making.
- This is an open-alpha communication-practice tool, not a consent system, capacity assessment, medical device, emergency plan, legal instrument, or proof of human presence.

## WebMCP constraints

- ChatGPT currently requires imperative `document.modelContext.registerTool()` calls from the top-level page. Do not use declarative form tools or iframe registration.
- Feature-detect the API and show an honest available/unavailable state.
- Register a stable superset exactly once, then enforce current-state authorization inside handlers. Resolve fresh state at invocation time.
- JSON Schemas use `additionalProperties: false` and bounded fields; Zod validates again in the handler.
- Every mutation requires expected revisions and an idempotency key.
- Keep annotations accurate and return enough structured evidence to recover from failure.
- Never register ratify, publish, share, export, delete, answer-for-person, set-signal, consent, capacity, diagnosis, contact, or crisis tools.
- Mocked registration tests do not prove ChatGPT discovery. Label the real built-in-browser smoke test unverified until performed.

## Commit and push protocol

For each coherent milestone: run targeted checks, then `pnpm lint`, `pnpm typecheck`, and `pnpm test`; UI, WebMCP, product, release, and documentation milestones also require `pnpm test:e2e` and `pnpm build`. Inspect `git diff`, run `git diff --check`, update `PLAN.md` and `PROGRESS.md`, inspect status, create one scoped commit, push `origin main`, and verify the remote SHA. Record impossible pre-scaffold checks rather than inventing a pass. Never force-push, amend pushed commits, rewrite history, discard user work, or silently skip tests.

## Definition of done

The public repository and live HTTPS app are accessible without login; the root license is detected; the worktree is clean and matches remote `main`; lint, typecheck, unit/property, WebMCP contract, Playwright, build, and axe gates pass; local persistence, history, import/export, print, demo reset, human rehearsal, WebMCP rehearsal, signal handling, pause/stop, stale recovery, staged suggestions, and visible owner ratification work; no ratification tool exists; documentation and under-three-minute submission materials are complete; and real ChatGPT discovery is either verified honestly or its exact external blocker is documented.
