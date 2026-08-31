# Threat model

## Assets

- private or sensitive communication preferences;
- the integrity of person-authored rules and semantic signals;
- owner-approved scenario state;
- ratified version history and canonical hashes;
- partner-adherence evidence;
- field-disclosure choices;
- trust in the visible owner-only workflow.

## Trust boundaries

```text
Person and visible controls
        │
        ├── browser origin ── IndexedDB (local, unencrypted)
        │          │
        │          └── top-level WebMCP adapter
        │                       │ explicitly disclosed result
        │                       v
        │                 active browser agent
        v
Imported/exported/printed files (outside app after action)
```

The static host serves code and headers but receives no app-domain writes. Browser extensions, the operating system, browser profile, active agent, exported files, and hosting request logs are outside the local domain-state boundary.

## Threats and mitigations

| Threat | Mitigation | Residual risk |
| --- | --- | --- |
| Agent reads unrelated/private fields | allowlisted DTO, entity + disclosure checks, private-notes type exclusion, projection tests | a person may intentionally expose sensitive wording |
| Agent changes owner-only state | separate owner/agent services; no signal, resume, review, ratify, share, export, contact, or delete tool | ordinary browser automation outside WebMCP remains subject to browser controls |
| Registered tools act while Human-only is selected | fail-closed durable permission defaults false; visible owner toggle increments session version; reads check invocation-time state; mutations recheck inside the transaction | a compromised page/browser can bypass application controls |
| Stale agent overwrites newer profile | profile/session compare-and-swap inside transaction; recovery action returns current revisions | concurrent UI can still require a visible retry |
| Duplicate invocation | scoped idempotency fingerprint and saved original result | storage clearing removes replay memory |
| Partial write | all documents parsed and written in one Dexie transaction; rollback tests | browser/storage failure can abort an action |
| Prompt/tool injection through text | all content treated as data, React escaped rendering, no HTML injection or code execution, narrow schemas | an agent can still misinterpret untrusted prose; deterministic guards limit effects |
| Import executes content | strict JSON-only schema, size/entity/text bounds, no URL or function fields | imported text may be offensive or misleading but remains inert text |
| Receipt leaks prose | fixed metadata schema and regression tests | IDs can reveal coarse workflow structure |
| Silence inferred as agreement | no silence event and no automatic advance | a human partner outside the tool may behave incorrectly |
| Stop ignored | visible Stop immediately enters terminal state; later partner turns return `SESSION_STOPPED` without advancing | a browser/page compromise could bypass all app code |
| Agent suggestion silently changes protocol | suggestion starts draft and agent-invisible; exact diff/provenance; per-item visible review; verification before ratification | the owner may accept a poor suggestion; the product does not assess decision quality |
| Local data read by another device user | honest unencrypted warning; no required name; low-stakes scope | no app-level encryption or operating-system isolation |
| Supply-chain compromise | pinned lockfile, minimal packages, Dependabot, audit, CI, no runtime third-party scripts | audits cannot prove dependencies are benign |
| Clickjacking/exfiltration | frame denial, CSP, form-action/self, connect/self, restricted permissions | inline CSP allowances reduce defense depth |

## Abuse cases explicitly out of scope

The app must not be used to infer or verify agreement, capacity, coercion, diagnosis, safety, legal authority, medical authorization, or emergency choices. It must not be used for minors or proxy-authored decisions. The product blocks high-stakes templates rather than claiming to make those uses safe.

## Security invariants

- silence never creates semantic state;
- Human-only blocks all WebMCP reads and writes until a visible owner action enables Agent rehearsal;
- only visible owner controls create person signal events;
- Pause blocks turns until visible owner resume;
- Stop is terminal for the session;
- unreviewed suggestions cannot be ratified;
- guide verification must match the current profile revision;
- no person-performance score exists;
- no handler can reach owner ratification.
