import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables `.next/standalone` — a minimal server bundle with only the
  // node_modules each page actually needs, used by the Docker build below.
  output: "standalone",
  // better-sqlite3 is auto-externalized by Next; pdfjs-dist (used server-side
  // to extract text from uploaded bank statement PDFs, see
  // src/server/import/pdf.ts) isn't on that built-in list, so it needs to be
  // opted out of Server Components bundling here.
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
