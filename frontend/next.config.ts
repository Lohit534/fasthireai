import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // These packages use Node.js native features / CJS require() and must NOT be
  // bundled by Turbopack/webpack. They are loaded at runtime via require() inside
  // serverless functions where Node.js is available.
  serverExternalPackages: ["pdf-parse", "mammoth"],
  async redirects() {
    return [
      {
        source: "/admin",
        destination: "/dashboard/admin",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
