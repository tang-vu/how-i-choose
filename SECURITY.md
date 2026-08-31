# Security policy

## Supported version

This repository is an open alpha. Security fixes are applied to the current `main` branch and production deployment. No long-term-support release exists yet.

## Report a vulnerability

Private vulnerability reporting is enabled. Use the repository's GitHub security-advisory flow: `Security` → `Advisories` → `Report a vulnerability`. Do not include real health information, private communication profiles, authentication material, or third-party data in a report.

## Security posture

- static application; no backend, account, remote database, server action, or runtime secret;
- local IndexedDB persistence, explicitly unencrypted;
- no analytics, advertising, external scripts, remote fonts, arbitrary URL fetch, or imported code execution;
- strict bounded Zod schemas for documents, imports, commands, and WebMCP inputs;
- strict JSON Schemas with `additionalProperties: false` for Site tools;
- safe React text rendering and no `dangerouslySetInnerHTML`;
- compare-and-swap revisions and idempotency inside one Dexie transaction;
- deny-by-default agent projection; private notes absent from the projection type;
- metadata-only activity receipts;
- no WebMCP clipboard, download, network, contact, delete, sharing, signal-selection, or ratification capability;
- CSP, HSTS at the host, frame denial, referrer policy, MIME sniffing protection, and restricted browser permissions;
- exact dependency lockfile, Dependabot alerts and automatic security fixes, production audit, and tracked-file secret-pattern scan;
- GitHub secret scanning and push protection on the public repository.

Run:

```bash
pnpm audit:prod
pnpm audit:secrets
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

## CSP note

The static Next.js export currently requires inline framework bootstrap/style support, so the CSP includes `'unsafe-inline'` for scripts and styles. It still blocks third-party origins, objects, framing, form exfiltration, and non-self connections. Removing inline allowances requires a nonce/hash build strategy that works with static export and is tracked as hardening work; the current policy is not described as perfect XSS protection.

## Local storage risk

Anyone with access to the browser profile or device may be able to inspect IndexedDB. Clearing site data removes local records. Browser extensions, compromised browser profiles, shared-device users, malware, backups, and developer tools sit outside the app's protection boundary. Do not enter information that should not be stored unencrypted on the device.

## WebMCP risk

Site tool definitions, page content, tool inputs, and tool results must be treated as untrusted. The active agent processes fields returned through tools. Browser safety review complements but does not replace app authorization. Revisions, disclosures, state guards, structural capability separation, and visible evidence remain authoritative.

See [THREAT_MODEL.md](THREAT_MODEL.md) and [PRIVACY.md](PRIVACY.md).
