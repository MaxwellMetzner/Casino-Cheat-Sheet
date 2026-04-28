import path from "node:path";
import type { NextConfig } from "next";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "Casino-Cheat-Sheet";
const requestedBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? process.env.BASE_PATH;
const normalizedBasePath = requestedBasePath
  ? requestedBasePath === "/"
    ? ""
    : requestedBasePath.replace(/\/$/, "")
  : process.env.GITHUB_ACTIONS === "true"
    ? `/${repoName}`
    : "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  experimental: {
    externalDir: true,
  },
  images: {
    unoptimized: true,
  },
  transpilePackages: ["casino-engine"],
  basePath: normalizedBasePath || undefined,
  assetPrefix: normalizedBasePath || undefined,
  turbopack: {
    root: path.join(__dirname, "../.."),
    resolveAlias: {
      "casino-engine": "./packages/casino-engine/src/index.ts",
    },
  },
};

export default nextConfig;
