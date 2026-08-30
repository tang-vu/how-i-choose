# Privacy

## Summary

How I Choose is local-first, not “device-only” in every mode. Profiles and rehearsals are stored in this browser. When Site tools are active, only fields explicitly exposed for the current rehearsal may be returned to and processed by the active browser agent.

## Data stored locally

- communication profiles, rules, signals, contexts, and disclosures;
- scenarios, sessions, structured events, and partner-adherence reports;
- immutable ratified snapshots and SHA-256 hashes;
- command idempotency records;
- activity receipts containing metadata only;
- transient onboarding and display preferences in browser storage.

IndexedDB storage is unencrypted. No name is required. The synthetic Maya profile contains no real person information.

## Data not collected by this project

There is no account, backend persistence, remote database, analytics SDK, advertising, third-party tracker, embedded chatbot, OpenAI API call, telemetry endpoint, or external runtime font/script. The static host necessarily receives ordinary HTTP request metadata such as IP address, route, browser headers, and timing under the host's own privacy terms; this application does not add tracking to those requests.

## Agent exposure

An agent projection starts empty and adds only entities that pass both controls:

1. the rule, signal, or context is marked agent-visible; and
2. a matching field disclosure is enabled for the active rehearsal.

The visible UI shows the shared/total field count. Private notes do not exist in the projection type. Hidden or unrelated profiles are not returned. Tool activity is visible in the local History panel.

Agent results may include person-authored text from shared fields. Once returned, that data is processed under the active agent/browser product's privacy controls. Disable Site tools in the browser or turn off field disclosures when that processing is not wanted.

## Receipts

Receipts store tool/source name, start/end time, duration, result code, profile revision, session version, changed IDs, and a correlation ID. They do not store input turns, profile text, scenario summaries, signal descriptions, rationale text, or private notes.

## Import, export, print, and deletion

JSON import/export and printing are initiated through visible human controls. Site tools have no clipboard, download, export, print, or delete operation. Exported files and print/PDF output leave the app's storage boundary and are the person's responsibility.

`Reset judge demo` replaces local workspace records with synthetic data. A user can also clear this site's storage through browser settings. A dedicated destructive profile-delete workflow is intentionally not included in this alpha.

## Retention

Data remains until the person resets/imports the workspace, clears site data, removes the browser profile, or the browser evicts storage. The project cannot remotely recover local data.

## Scope

Use only for self-authored adult communication preferences and low-stakes practice. Do not enter real emergency, treatment, contract, payment, or crisis information.
