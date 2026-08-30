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
- [ ] At 400% browser zoom, content reflows without clipping, overlap, or lost controls.
- [ ] At 200% text-only zoom, text is not clipped and controls grow or wrap.
- [ ] Windows High Contrast/forced-colors preserves focus, boundaries, selected state, and signal labels.
- [ ] Reduced motion removes non-essential transitions without hiding state changes.
- [ ] Quiet mode reduces simultaneous panels but keeps Pause, Stop, status, and current task visible.
- [ ] Plain-language mode avoids changing permissions or underlying semantic meaning.
- [ ] Light/dark OS preferences preserve at least AA contrast for text and essential controls.

## Release record

Automated Chromium/axe coverage is part of CI. Manual keyboard, screen-reader, 400% reflow, and real assistive-technology results must be dated in [JUDGE_CHECKLIST.md](JUDGE_CHECKLIST.md). An unchecked item means unverified, not failed.
