<div align="center">

# Shadcn Fintech

A premium, open-source fintech dashboard built with Next.js, shadcn/ui, and Tailwind CSS.

[![CI](https://github.com/abderrahimghazali/shadcn-fintech/actions/workflows/ci.yml/badge.svg)](https://github.com/abderrahimghazali/shadcn-fintech/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-latest-black)](https://ui.shadcn.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-black)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-black)](https://typescriptlang.org)

[Live Demo](https://shadcn-fintech.vercel.app) · [Report Bug](https://github.com/abderrahimghazali/shadcn-fintech/issues) · [Request Feature](https://github.com/abderrahimghazali/shadcn-fintech/issues)

![Shadcn Fintech Dashboard](public/screenshots/shadcn-fintech.png)

</div>

## Features

- **11 fully built pages** — Dashboard, Accounts, Transactions, Transfers, Cards, Crypto, Analytics, Investments, Budgets, Settings, Notifications
- **Crypto dashboard** — Candlestick chart, live portfolio, trade form, market overview with 8 coins
- **Drag-and-drop dashboard** — Rearrange widgets with dnd-kit, persisted to localStorage
- **Interactive credit cards** — 3D flip animation, freeze toggle, virtual card generator
- **Live investment ticker** — Simulated real-time price updates with flash animations
- **Spending heatmap** — GitHub-style 365-day calendar visualization
- **Actionable notifications** — Accept/decline money requests and split-bill requests inline
- **Smart analytics** — Category drill-down donuts, recurring charge detector, AI insights
- **Budget tracking** — Animated SVG progress rings, savings goals, month projection
- **Quick transfers** — Contact selector with send simulation
- **Auth pages** — Sign in / sign up UI with animated 3D globe (cosmetic only — see [Deployment](#deployment))
- **Dark mode** — Full dark/light/system theme support
- **Responsive** — Works on desktop, tablet, and mobile

## Pages

| Page | Description |
|------|-------------|
| `/dashboard` | Financial overview, wallet cards, quick transfer, spending limit, money movement |
| `/accounts` | Linked bank accounts with balances, add account flow |
| `/transactions` | Searchable table with filters, expandable rows, bulk CSV export |
| `/transfers` | Send/receive/scheduled transfers with stats and quick send |
| `/cards` | 3D flip card, freeze/unfreeze, spending controls, virtual card creator |
| `/analytics` | Spending heatmap, category breakdown, recurring charges, AI insights |
| `/crypto` | Candlestick chart, portfolio balance, top coins, trade form, market overview |
| `/investments` | Portfolio allocation, holdings with sparklines, live ticker, watchlist |
| `/budgets` | Budget rings, savings goals, spending calendar, month projection |
| `/settings` | Profile, security, notifications, categories, modules, appearance |
| `/notifications` | Filterable notification feed with dismiss animations |
| `/sign-in` | Auth page with animated 3D globe — cosmetic only, not wired to real auth |
| `/sign-up` | Registration with name, email, password, terms acceptance |

## Tech Stack

| | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| UI | [shadcn/ui](https://ui.shadcn.com) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Charts | [Recharts](https://recharts.org) |
| Animations | [Motion](https://motion.dev) |
| Drag & Drop | [@dnd-kit](https://dndkit.com) |
| Auth | None — see [Deployment](#deployment) below. `/sign-in` and `/sign-up` are unwired UI only. |
| 3D Globe | [three-globe](https://github.com/vasturiano/three-globe) + [Aceternity UI](https://ui.aceternity.com) |
| Icons | [Lucide React](https://lucide.dev) |
| Language | TypeScript |

## Getting Started

```bash
git clone https://github.com/abderrahimghazali/shadcn-fintech.git
cd shadcn-fintech
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

## Customization

**Theme** — Edit `src/app/globals.css` to customize colors. Full dark mode support via CSS variables.

**Sample data** — Crypto, Investments, and Help & Support (plus the dashboard health-score widget and the AI-insights card on Analytics) are still sample data only — they're marked "Preview" in the UI and absent from the main nav. Their fixtures live in `src/data/seed.ts`. Everything else (accounts, cards, transactions, transfers, budgets, savings goals, notifications, categories) is real, DB-backed data — see [Database Lifecycle](#database-lifecycle) below for how that gets seeded.

**Dashboard Layout** — Click "Customize" on the dashboard to drag and rearrange widgets. Persists to localStorage.

## Deployment

There is **no app-level authentication** — every page and API route is scoped to a single account (see `DEMO_USER_ID` in `src/server/db/index.ts`), with no login, session, or password check in front of any of it. That's a deliberate simplification for a single-owner deployment, not an oversight, but it means **network isolation is the auth**. Before putting this anywhere reachable:

- Run it behind a private network layer you control — [Tailscale](https://tailscale.com) (`tailscale serve`), Cloudflare Access, an SSH tunnel, or a VPN. Never expose the port directly to the public internet.
- `docker-compose.yml` binds the container to `127.0.0.1:3000` for exactly this reason — widen that only once a real access layer is in front of it.
- Set `TZ` (default `Asia/Manila` in the Dockerfile/compose) to your own timezone — it drives every "this month" / "last 30 days" / credit-card due-date window in the app (see `src/lib/today.ts`).
- Set `OWNER_NAME` / `OWNER_EMAIL` to your own name and email before first boot — see [Database Lifecycle](#database-lifecycle).

```bash
docker compose up --build -d
```

## Database Lifecycle

The database is SQLite, and it is **not baked into the Docker image** — it lives on a bind-mounted host directory (`./data`, see `docker-compose.yml`) so it survives image rebuilds and redeploys.

On every boot, `src/instrumentation.ts` runs automatically, before the server accepts any requests:

1. Applies any pending Drizzle migrations (`drizzle/*.sql`).
2. Runs `bootstrap()` (`src/server/db/bootstrap.ts`) — idempotent and additive-only. It inserts the owner's user row (from `OWNER_NAME`/`OWNER_EMAIL`, falling back to placeholder values) and the category/budget-bucket reference data the UI assumes exists, but never touches accounts, cards, transactions, or anything else. It's safe to run against a database that already has real data — it only ever fills in what's missing.

This means a brand-new deployment starts **empty but fully migrated**, not pre-loaded with demo data.

For local development, `pnpm db:reset` still gives you the full demo dataset (fictional accounts, cards, a year of transaction history, two staged credit-card states) — generated relative to whatever day you run it, so it always lands inside the app's live date windows. The scripts:

| Script | What it does | Where it runs |
|---|---|---|
| `pnpm db:bootstrap` | Same idempotent bootstrap as boot-time — user + reference data only | Anywhere, safe on real data |
| `pnpm db:seed` | **Destructive** — wipes every table, seeds the full demo dataset | Local dev only; refuses to run with `NODE_ENV=production` |
| `pnpm db:reset` | Recreates the DB file, migrates, then `db:seed` | Local dev only |
| `pnpm db:migrate` | Applies pending migrations without seeding | Local dev (production migrates automatically at boot) |

## Backup & Restore

**Backup** — `pnpm db:backup` (`scripts/backup.ts`) runs `VACUUM INTO`, which is safe against a live database in WAL mode (an ordinary file copy can miss recently-committed rows still sitting in the `-wal` file). Backups land in `backups/app-<timestamp>.db`, with the oldest pruned once there are more than 30. Run it from the host — the bind mount means `./data/app.db` is an ordinary file there, no need to exec into the container.

**Restore**:
```bash
docker compose stop
cp backups/app-<timestamp>.db data/app.db
rm -f data/app.db-wal data/app.db-shm
docker compose start
```

Take a backup before every image upgrade — migrations run automatically at boot and there is no down-migration path.

## Sponsor this project

This project is free and open-source. If it helped you build something, saved you time, or you just think it's cool — consider supporting its development. Your sponsorship helps keep this project maintained, improved, and free for everyone.

<a href="https://github.com/sponsors/abderrahimghazali">
  <img src="https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?logo=github&logoColor=white" alt="Sponsor on GitHub" />
</a>
<a href="https://buymeacoffee.com/abderrahimghazali">
  <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?logo=buy-me-a-coffee&logoColor=black" alt="Buy Me a Coffee" />
</a>

Every star, share, and contribution also goes a long way. Thank you for your support!

## License

Licensed under the [MIT License](LICENSE).

## Author

Created with ❤️ by **[Abderrahim Ghazali](https://github.com/abderrahimghazali)**

Need help getting started or have a question? Feel free to reach out — I'm happy to help.

<a href="https://cal.com/abderrahimghazali/15min?overlayCalendar=true">
  <img src="https://img.shields.io/badge/Book%20a%20call-Cal.com-292929?logo=cal.com&logoColor=white" alt="Book a call" />
</a>
