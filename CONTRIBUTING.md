# Contributing

Thank you for helping make communication practice more respectful and accessible. How I Choose is an open alpha; contributions must preserve owner authority and avoid claims that exceed the evidence.

## Start here

Read [AGENTS.md](AGENTS.md), [ARCHITECTURE.md](ARCHITECTURE.md), [PRIVACY.md](PRIVACY.md), [THREAT_MODEL.md](THREAT_MODEL.md), and [CO_DESIGN.md](CO_DESIGN.md). For security reports, use the private process in [SECURITY.md](SECURITY.md), not a public issue.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Use Node 24.x and pnpm 11.24.0. Keep dependency versions exact in `pnpm-lock.yaml`.

## Product invariants

- Evaluate the communication partner, never the person.
- Silence or delay creates no semantic event and never advances a rehearsal.
- Only visible human controls may select signals, resume, review suggestions, import/export, or ratify.
- Stop is terminal for the current rehearsal.
- Agent suggestions stay drafts with exact provenance until visibly reviewed item by item.
- Agent projections are allowlisted and disclosure-gated; private notes are never projected.
- Human and WebMCP paths call the same application and domain services.
- Do not introduce a person, comprehension, consistency, capacity, consent, emotion, or diagnosis score.

## Code and tests

Keep durable state in Dexie, transient presentation state in Zustand, state transitions in pure TypeScript, and boundaries in strict Zod schemas. Do not add direct IndexedDB/Zustand mutations to WebMCP handlers. Render text safely; do not use `dangerouslySetInnerHTML`.

Every behavior change needs tests at the narrowest useful layer. UI changes also need desktop and narrow Playwright coverage and axe checks for affected states. WebMCP changes need strict-schema, current-state, revision, authority, and forbidden-tool regression coverage.

## Accessibility review

Use semantic HTML and native controls first. Preserve complete keyboard operation, visible focus, meaningful headings/landmarks, large targets, live announcements, persistent Pause/Stop, no timer, and no color-only meaning. Follow [ACCESSIBILITY.md](ACCESSIBILITY.md); never treat a clean automated scan as proof of conformance.

## Pull requests

Keep changes coherent and small. Explain the product/safety effect, tests run, accessibility evidence, privacy impact, and any new limitation. Run `git diff --check` and the full quality gates before requesting review. Never include real personal communication data in tests, screenshots, issues, or commits.

By contributing, you agree that your contribution is licensed under the repository's MIT license.
