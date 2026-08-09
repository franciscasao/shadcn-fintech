import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables `.next/standalone` — a minimal server bundle with only the
  // node_modules each page actually needs, used by the Docker build below.
  output: "standalone",
  // Pins the file-tracing root to this project, not wherever Next's
  // lockfile auto-detection happens to walk up to. Without this, a lockfile
  // in a parent directory (e.g. this repo checked out inside another
  // project, or a stray package-lock.json a few levels up) gets picked as
  // the root instead — which both mis-nests `.next/standalone` output a
  // directory deeper than expected AND makes the dependency trace miss
  // most of node_modules (drizzle-orm included), since it looks for
  // packages relative to the wrong root. `pnpm build` outside Docker would
  // then produce a standalone build that's missing runtime dependencies
  // with no error — it just crashes on `node server.js`.
  outputFileTracingRoot: path.join(__dirname),
  // better-sqlite3 is auto-externalized by Next; pdfjs-dist (used server-side
  // to extract text from uploaded bank statement PDFs, see
  // src/server/import/pdf.ts) isn't on that built-in list, so it needs to be
  // opted out of Server Components bundling here.
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
