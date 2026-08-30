import { execFileSync, spawnSync } from "node:child_process";

const commit = execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
  encoding: "utf8",
}).trim();
const options = new Set(process.argv.slice(2));
for (const option of options) {
  if (option !== "--dry-run") throw new Error(`Unsupported deploy option: ${option}`);
}
const vercelArguments = [
  "dlx",
  "vercel",
  "--prod",
  "--yes",
  "--build-env",
  `NEXT_PUBLIC_BUILD_COMMIT=${commit}`,
  ...(options.has("--dry-run") ? ["--dry"] : []),
];
const command = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "pnpm";
const commandArguments = process.platform === "win32"
  ? ["/d", "/s", "/c", "pnpm", ...vercelArguments]
  : vercelArguments;
const result = spawnSync(
  command,
  commandArguments,
  {
    stdio: "inherit",
    env: { ...process.env, NEXT_PUBLIC_BUILD_COMMIT: commit },
  },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
