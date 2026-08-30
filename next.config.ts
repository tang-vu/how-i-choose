import type { NextConfig } from "next";

const buildCommit = (
  process.env.NEXT_PUBLIC_BUILD_COMMIT ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.GITHUB_SHA ??
  "local"
).slice(0, 12);

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version ?? "0.1.0",
    NEXT_PUBLIC_BUILD_COMMIT: buildCommit,
  },
};

export default nextConfig;
