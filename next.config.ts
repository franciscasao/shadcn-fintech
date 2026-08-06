import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables `.next/standalone` — a minimal server bundle with only the
  // node_modules each page actually needs, used by the Docker build below.
  output: "standalone",
};

export default nextConfig;
