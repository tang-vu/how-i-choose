# Limitations

How I Choose is an open alpha communication-practice tool. It has not been clinically validated and is not ready for organizational or healthcare deployment.

## Current evidence limits

- The project has not yet been co-designed or validated with the intended disabled communities.
- Automated axe checks cover tested application states but do not establish WCAG conformance.
- Keyboard, screen-reader, forced-colors, reduced-motion, and 400% reflow checks must be repeated manually for each release.
- Mocked `document.modelContext` tests prove registration and page behavior, not real ChatGPT discovery.
- Mechanical language lint can flag phrases; it cannot prove neutrality, coercion, understanding, emotion, or intent.
- SHA-256 identifies canonical content; it does not prove who reviewed it or that a human was present.
- The visible owner workflow is an interface control, not identity verification.

## Technical limits

- Browser storage is local and unencrypted.
- Clearing/evicting site data can remove the workspace; there is no remote recovery.
- No cloud sync, accounts, multi-device access, or real-time supporter collaboration.
- No audio, speech recognition, transcription, emotion detection, or custom AAC symbol library.
- English-only interface and synthetic English fixtures.
- Experimental WebMCP APIs and ChatGPT eligibility may change.
- Static-export CSP still permits inline framework script/style bootstrap.
- One active workspace is managed at a time in the alpha UI.
- Undo covers the most recent profile draft edit in the current editing session.

## Scope limits

Only self-authored adult profiles and low-stakes rehearsals are supported. There are no minors, proxies, substituted decisions, emergencies, treatment choices, contracts, payments, crisis scenarios, public sharing, QR sharing, contacts, legal signatures, or healthcare integrations.

Communication difficulty is not inability to decide. Silence or delay is never agreement. The report evaluates the communication partner, not the person.

## Before broader use

Broader use requires compensated co-design, governance, accessibility studies with multiple access methods, threat/privacy review, independent safety review, real-world longitudinal evaluation, localized language work, support/incident processes, and clear organizational accountability. See [CO_DESIGN.md](CO_DESIGN.md).
