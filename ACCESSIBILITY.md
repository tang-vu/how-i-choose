# Accessibility review

How I Choose targets WCAG 2.2 AA engineering practices. This is a target, not a conformance claim. Automated checks and synthetic testing cannot substitute for evaluation with disabled people using their own access methods.

## Implemented foundations

- semantic header, navigation, main, sections, headings, lists, forms, tables, and footer;
- skip link, logical source order, native keyboard controls, and visible focus indicators;
- persistent, text-labeled Pause and Stop controls with generous targets;
- text labels and semantic meanings on every signal; color is supplementary;
- polite live regions for actions and validation, and assertive announcements for Stop/error states;
- no automatic advance, countdown, forced timer, gesture-only action, or disappearing alert;
- high-contrast, reduced-motion, larger-text, quiet, and plain-language preferences;
- scrollable labeled regions for tables and an accessible list alternative to visual summaries;
- print-specific support-guide view with the required boundary statement;
- desktop and narrow automated coverage.

## Automated release checks

Run:

```bash
pnpm test:e2e
```

The suite checks axe at the landing page, workspace, stopped state, and reviewed/ratified state in desktop and narrow Chromium. It fails on serious or critical findings. It also exercises accessibility preferences. A zero-finding result is not a complete WCAG audit.

On Windows, an assisted real-browser/assistive-technology smoke can also be run with NVDA already active:

```bash
pnpm smoke:a11y-assisted https://how-i-choose.vercel.app <temporary-artifact-directory>
```

The harness uses installed Chrome, applies actual browser zoom keys, proves the resulting 400% scale from `innerWidth` and device-pixel ratio, checks page/action/text clipping across critical states, captures the real OS window, and sends NVDA heading/table quick-navigation keys. Artifacts and raw NVDA logs belong in a temporary directory, not the repository, because assistive-technology logs can include unrelated desktop context.

## Manual keyboard checklist

- [ ] Start at the address bar and reach `Skip to main content` with Tab.
- [ ] Activate the skip link; focus moves to the main content.
- [ ] Complete onboarding without a pointer.
- [ ] Reach every primary navigation destination in a logical order.
- [ ] Edit and save profile rules, signals, disclosures, and scenario review controls.
- [ ] Start a human rehearsal; select each signal; Pause, Resume, and Stop.
- [ ] Confirm focus is always visible and never trapped.
- [ ] Confirm disabled controls are understandable from nearby state text.
- [ ] Review a staged diff item and verify/ratify a guide using only the keyboard.
- [ ] Operate export, file import, print, reset, and accessibility preferences.

## Manual screen-reader checklist

Repeat with at least NVDA + current Chrome on Windows; add VoiceOver + Safari before any broader release.

- [ ] Page title, landmarks, one page-level heading, and heading hierarchy are announced.
- [ ] Primary navigation and current workspace context are understandable.
- [ ] Profile labels, help text, required state, validation errors, and revision updates are announced.
- [ ] Signal button label includes color name, semantic meaning, and expected partner action.
- [ ] Pending signal, Pause, Resume, Stop, accepted/rejected turn, and stale revision are announced once.
- [ ] Partner turns and response options have meaningful reading order.
- [ ] Diff before/after/provenance and per-item actions are understandable.
- [ ] Tables expose captions, column headers, and scrollable-region labels.
- [ ] Support-guide draft watermark and boundary statement are announced.
- [ ] Site-tools availability and activity receipts do not create excessive chatter.

## Display and cognition checklist

- [ ] At 320 CSS pixels wide, there is no two-dimensional page scrolling and all actions remain reachable.
- [x] At 400% browser zoom, content reflows without clipping, overlap, or lost controls. Verified 2026-08-31 with installed Chrome 151.0.7922.175 at measured 400% across landing, ready, active, paused, stopped, and Support Guide states.
- [ ] At 200% text-only zoom, text is not clipped and controls grow or wrap.
- [ ] Windows High Contrast/forced-colors preserves focus, boundaries, selected state, and signal labels.
- [ ] Reduced motion removes non-essential transitions without hiding state changes.
- [ ] Quiet mode reduces simultaneous panels but keeps Pause, Stop, status, and current task visible.
- [ ] Plain-language mode avoids changing permissions or underlying semantic meaning.
- [ ] Light/dark OS preferences preserve at least AA contrast for text and essential controls.

## Release record

Automated Chromium/axe coverage is part of CI. On 2026-08-31, a Codex-operated run used the real NVDA 2026.2 process and installed Chrome 151.0.7922.175 against the release candidate. The reviewed NVDA speech-output log confirmed the page title, named main landmark, focused page heading from the skip link, signal label/meaning/partner action, live state changes, terminal Stop alert, Agent rehearsal disclosure, Support Guide heading, and a captioned 2-by-4 history table. The same run measured actual browser zoom at exactly 400% and visually reviewed OS-window captures with no page overflow, clipped text, clipped action, or horizontally scrolling primary navigation.

This is real software output and repeatable engineering evidence, but Codex is not a human screen-reader user. A human auditory/usability review remains separately unverified and must not be inferred from this record. Comprehensive manual keyboard, screen-reader, forced-colors, and print results must be dated in [JUDGE_CHECKLIST.md](JUDGE_CHECKLIST.md). An unchecked item means unverified, not failed.

Version and operating guidance came from the official [NVDA 2026.2 release](https://www.nvaccess.org/post/nvda-2026-2/) and [NVDA User Guide](https://download.nvaccess.org/documentation/en/userGuide.html).
