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

# ── builder: produce the standalone build ──────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build

# ── runner: minimal production image ───────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL=file:./data/app.db
# Real financial data with no app-level auth (see README's Deployment
# section) — the container must never be reachable except through a
# network layer you control (Tailscale, Cloudflare Access, etc). TZ matters
# beyond cosmetics: "today" (@/lib/today) drives every date window in the
# app, and Alpine has no zoneinfo without tzdata below — an unset/wrong TZ
# silently shifts what counts as "this month" by hours, not just display.
ENV TZ=Asia/Manila

RUN apk add --no-cache tzdata

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# The database itself is NOT baked into the image — it's real user data
# that lives in a bind-mounted volume (see docker-compose.yml) and gets
# migrated + bootstrapped at boot by src/instrumentation.ts, not at build
# time. Only the migration definitions ship in the image.
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

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
