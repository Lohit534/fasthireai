import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These packages use Node.js native features / CJS require() and must NOT be
  // bundled by Turbopack/webpack. They are loaded at runtime via require() inside
  // serverless functions where Node.js is available.
  serverExternalPackages: ["pdf-parse", "mammoth"],
};

export default nextConfig;
