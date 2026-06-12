import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (.next/standalone) for the
  // production Docker image (frontend/Dockerfile.prod). No effect on `next dev`.
  output: "standalone",
};

export default nextConfig;
