# Devpost submission

Submission title: **How I Choose: Communication practice that respects every signal.**

Tagline: **My signals. My pace. How I choose.**

Status: submitted by the owner on September 1, 2026; public project page and authorized video are linked below.

## What the product does

How I Choose is a local-first communication rehearsal workspace for adults. A person authors the channels, wording, pace, processing time, literal-language preferences, semantic signals, and partner actions that help when speech or processing becomes difficult. They choose which fields an active browser agent may read.

The defining inversion is simple: most conversation tools evaluate how well the person performed. How I Choose evaluates whether the communication partner adapted to the person.

A deterministic browser-independent engine checks structured partner turns before they appear. It enforces one question at a time, word and option limits, channel rules, no defaults or countdowns, signal acknowledgment, Pause, terminal Stop, stale revisions, conflicts, and idempotency. Silence creates no event and never advances a rehearsal. Reports contain partner-adherence evidence, never a score of the person.

The complete human-only product includes guided onboarding, blank and synthetic profiles, low-stakes templates, profile and signal editing, a large signal board, rehearsal audit, staged protocol diffs, version history, JSON import/export, print support guide, privacy controls, and accessibility preferences.

## Why WebMCP is a strong fit

This rehearsal needs an agent to operate inside the person’s current, visible, revisioned protocol—not in a detached chat with copied instructions. WebMCP lets ChatGPT use the page’s existing authorization, state machine, deterministic validator, and evidence while the person keeps direct control of signals and approval.

No account, API key, backend, embedded chatbot, remote database, or external model call is needed. WebMCP adds an agent practice layer to a product that remains fully useful without it.

## What humans and agents can do together

The person can approve a scenario, select exact semantic signals, pause, stop, change rules during rehearsal, review every suggested diff, and ratify a support guide visibly. ChatGPT can read only exposed fields, audit readiness, start the already-approved scenario, propose a structured turn, read the exact selected signal, inspect its own adherence, stage provenance-linked improvements, and verify guide derivation.

That creates a recoverable loop that was previously difficult: a deliberately invalid question is rejected before display; the agent repairs it; the person signals uncertainty; the agent rephrases; a mid-session person-authored rule change invalidates the agent’s stale write; the agent rereads and adapts; Stop blocks further turns; and the report grades the agent’s behavior.

The agent cannot select a signal, answer, resume, review its own suggestion, ratify, publish, share, export, contact someone, delete a profile, or assess communication ability, comprehension, capacity, coercion, safety, diagnosis, or consent.

## How WebMCP was implemented

The top-level `/demo/` page feature-detects and imperatively registers eight tools through `document.modelContext.registerTool()`:

- `get_rehearsal_brief`
- `audit_rehearsal_readiness`
- `start_approved_rehearsal`
- `offer_partner_turn`
- `read_latest_signal`
- `get_rehearsal_report`
- `stage_protocol_patch`
- `verify_support_guide`

A singleton guard prevents React Strict Mode duplicates. Every object schema is closed with `additionalProperties: false`; Zod validates again at the application boundary. Mutations require expected profile/session revisions and an idempotency key. Handlers load current IndexedDB state during execution and call the same services as the UI. They never mutate Zustand or IndexedDB directly.

Every invocation leaves a sanitized receipt with tool, timing, code, versions, changed IDs, and correlation ID—not full authored text. A stable registered superset uses identical state guards because discovery reliability is more important than dynamic catalog changes in an experimental API.

## Potential impact

How I Choose demonstrates a more accountable role for communication agents: adaptation is testable, the person remains the semantic source of truth, and agent authority is both narrow and visible. The architecture could support future co-designed research into communication partnership without turning delay, distress, or non-speech into an inferred answer.

The initial release is deliberately small. Its value is an executable pattern—structured communication protocols, revision recovery, owner-only signals and ratification, provenance, and partner-focused evidence—not a claim that software can decide what a person means.

## Safety and privacy

How I Choose is communication practice, not a consent system. Communication difficulty is not inability to decide. Silence or delayed response is never agreement. No diagnosis is required.

It supports self-authored adult profiles and synthetic or low-stakes scenarios only. It excludes minors, proxies, substituted decisions, emergencies, crisis scenarios, treatment choices, contracts, payments, and real healthcare decisions. It has not been clinically validated. Challenge data and personas are synthetic. Healthcare or organizational use requires future compensated co-design, accessibility research, governance, independent review, and validation.

Data is stored locally and unencrypted in IndexedDB. There is no account, analytics SDK, advertising, tracking, external runtime script/font, or server database. When Site tools run, explicitly exposed fields are processed by the active browser agent; the product states this plainly rather than claiming all data always remains on-device.

Every support guide includes: “Ask me directly whenever possible. This guide explains how to communicate with me. It is not consent, a capacity assessment, an advance directive, or medical authorization.”

## Technology stack

Next.js App Router static export, React, strict TypeScript, Tailwind CSS, Zustand, Dexie/IndexedDB, Zod, Vitest, Testing Library, fast-check, Playwright, and axe-core. Vercel hosts static HTTPS assets; there is no runtime secret or database.

## Links

- Live product: https://how-i-choose.vercel.app/
- Deterministic demo: https://how-i-choose.vercel.app/demo/
- Public repository: https://github.com/tang-vu/how-i-choose
- Devpost project: https://devpost.com/software/how-i-choose
- Demo video: https://youtu.be/hBpjiDQn6k0

## Verification disclosure

Automated domain, property, service, contract, full-browser, narrow-viewport, and axe tests are reproducible in the repository. Mocked `document.modelContext` tests do not prove discovery in the real ChatGPT built-in browser. Separate owner-run checks on August 31, 2026 verified real discovery and invocation of all eight deployed Site tools, including fail-closed Human-only authorization and visible owner-enabled access; the dated record is in `JUDGE_CHECKLIST.md`.
