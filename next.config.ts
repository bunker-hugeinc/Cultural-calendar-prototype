import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. A stray package-lock.json in the
  // home directory otherwise makes Next/Turbopack infer the wrong root.
  // process.cwd() is the project dir for both `next dev` and `next build`,
  // and avoids ESM-only syntax that breaks config compilation.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
