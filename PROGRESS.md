# Progress log

Updated: 2026-08-30 (Asia/Saigon)

## M0 — Environment and requirements verified

Work completed:

- Inspected the empty repository, Git state, remote, runtime, package managers, GitHub auth, hosting CLI/auth state, and existing files.
- Confirmed GitHub authentication belongs to `tang-vu` with repository/workflow scope.
- Confirmed the current official challenge deadline and submission/judging requirements.
- Read current official OpenAI Site tools guidance, Chrome imperative WebMCP guidance, and the August 26, 2026 draft.
- Confirmed ChatGPT requires imperative registration through `document.modelContext.registerTool()` from the top-level page; declarative form tools and iframe registrations are unsupported.
- Completed independent accessibility/safety and architecture/test reviews.

Validation run:

- `git status`, remotes, branch, and history inspected.
- Node `v24.14.1`, pnpm `11.20.0`, npm `11.11.0`, Corepack `0.34.6` recorded.
- `gh auth status` and repository metadata checked.
- Vercel CLI is not globally installed, but an authenticated local Vercel configuration and account were detected via an ephemeral current CLI check.

Remaining risks:

- Real ChatGPT Site tools discovery has not been tested and remains unverified.
- The WebMCP API is experimental and the challenge schedule is compressed.
- No production deployment exists yet.

Verified deployment URL: none yet.

## M1 — Public open-source repository initialized

Work completed:

- Changed `tang-vu/how-i-choose` from private to public.
- Added the root MIT `LICENSE`.
- Preserved the pre-existing initial commit and public history.

Validation run:

- GitHub visibility returned `PUBLIC`.
- `git diff --check` passed.
- Commit `9c2f70b1eb312eb9b81be94d12a5972341822c0e` was pushed to `origin/main` and verified with `git ls-remote`.
- Worktree was clean after push.
- Application lint, typecheck, unit, E2E, and build scripts did not exist at this pre-scaffold milestone; no pass is claimed.

Remaining risks:

- GitHub license detection can lag after the first push and will be checked again during release hardening.
- Product, tests, docs, deployment, and submission assets remain to be built.

Verified deployment URL: none yet.

## M2 — Product contract and delivery documents

Work completed:

- Added `AGENTS.md`, `PLAN.md`, `PROGRESS.md`, `DECISIONS.md`, and `RISKS.md` before application implementation.
- Captured repository structure, command contract, architectural boundaries, accessibility and privacy requirements, WebMCP constraints, commit protocol, milestone gates, dependencies, cut lines, demo path, primary decisions, and the required risk register.
- Incorporated the independent WebMCP, architecture/test, and accessibility/safety reviews.

Validation run:

- Verified all required sections and required named risks with repository searches.
- `git diff --check` passed.
- Application lint, typecheck, unit, E2E, and build scripts still do not exist at this pre-scaffold documentation milestone; no pass is claimed.

Remaining risks:

- All implementation, automated quality gates, deployment, and real ChatGPT discovery remain outstanding.

Verified deployment URL: none yet.

## M3 — Application scaffold, quality gates, and early production deployment

Work completed:

- Added a pinned Next.js 16 App Router and React 19 static-export application with strict TypeScript, Tailwind CSS 4, ESLint, Vitest, Testing Library, fast-check, Playwright, axe, Dexie, Zustand, and Zod.
- Added an original responsive product shell, semantic primary navigation, synthetic `/demo/` route, local favicon/OG artwork, no runtime external fonts, useful 404 page, build/version footer, visible Site tools feature detection, and baseline privacy/safety wording.
- Added strict CSP and security headers for Vercel, production-static Playwright serving, desktop/narrow projects, and initial accessibility smoke checks.
- Deployed production over HTTPS and connected the public GitHub repository to the authenticated Vercel project.
- Updated the GitHub repository description, homepage, and confirmed MIT license detection.

Validation run:

- `pnpm peers check` passed with no peer dependency issues.
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test` passed: 1 file, 2 tests.
- `pnpm test:e2e` passed: 6 tests across desktop and narrow Chromium; initial `/` and `/demo/` states had zero serious or critical axe findings.
- `pnpm build` passed and emitted static `/`, `/demo`, and 404 pages.
- HTTPS smoke checks returned `200` for `/` and `/demo/`, with CSP, Permissions Policy, HSTS, referrer, nosniff, and frame-deny headers present.
- The first production deployment was created from the pre-scaffold Git HEAD; it will be redeployed after this milestone commit so the visible footer matches source.

Remaining risks:

- The current shell is not yet the complete interactive product.
- Manual keyboard, screen-reader, forced-colors, and 400% reflow checks are not yet complete.
- Real ChatGPT Site tools discovery remains unverified because tools are not implemented yet.
- Vercel reports the broad Node engine range may auto-upgrade; pinning the deployment major is deferred to release hardening.

Verified deployment URL: https://how-i-choose.vercel.app

Current next milestone: M4 — versioned domain model, deterministic rehearsal engine, and property tests.
