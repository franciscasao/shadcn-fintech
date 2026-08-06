# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# ── deps: install once, reused by both the seed and build stages ──────────
# better-sqlite3's binding.gyp gives it an implicit `node-gyp rebuild`
# install step (this project's package.json opts into that explicitly via
# pnpm.onlyBuiltDependencies, rather than trusting its prebuilt binaries),
# so the toolchain below is required even on alpine. Scoped to this stage
# only — builder/runner derive from `base`, not `deps`, so the final image
# doesn't carry it.
FROM base AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── builder: seed the demo SQLite DB, then produce the standalone build ───
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# This is a demo/template app — the SQLite DB is fixture data generated at
# build time, not real user data, so it's baked into the image rather than
# migrated at container startup (which would need drizzle-kit/tsx at
# runtime). See the docker-compose.yml volume comment for how this
# interacts with persistence across restarts.
RUN pnpm db:migrate && pnpm db:seed
RUN pnpm build

# ── runner: minimal production image ───────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL=file:./data/app.db

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/data ./data

# Defensive: better-sqlite3's compiled build/Release/*.node binary is
# resolved via a dynamically-built path at require-time, which static file
# tracers (like Next's output-file-tracing) can be unreliable about
# capturing. Copy the whole package explicitly rather than trust the trace.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
