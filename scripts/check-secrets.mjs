import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const patterns = [
  { name: "private key", value: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "OpenAI-style secret", value: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { name: "GitHub token", value: /\bgh[opusr]_[A-Za-z0-9]{20,}\b/ },
  { name: "AWS access key", value: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "Vercel token assignment", value: /VERCEL_TOKEN\s*=\s*["']?[A-Za-z0-9_-]{20,}/ },
];

const tracked = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const findings = [];
for (const file of tracked) {
  if (/\.(?:png|jpg|jpeg|gif|webp|ico|woff2?)$/i.test(file)) continue;
  const contents = readFileSync(file, "utf8");
  for (const pattern of patterns) {
    if (pattern.value.test(contents)) findings.push(`${file}: ${pattern.name}`);
  }
}

if (findings.length > 0) {
  process.stderr.write(`Potential committed secrets found:\n${findings.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Secret pattern scan passed across ${tracked.length} tracked and untracked release files.\n`);
}
