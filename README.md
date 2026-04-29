# Sway

A lightweight real-time app for group decision-making.

Create a board, share options, and collect votes, reactions, and comments — no account required.

## Demo
**🔗 Live** https://www.sendasway.com/

|<img width="330" height="600" alt="image" src="https://github.com/user-attachments/assets/dbad75d5-1acd-4840-91c8-c170014dd127" /> |<img width="330" height="600" alt="image" src="https://github.com/user-attachments/assets/720e0cfb-91ab-47fa-bafc-b6e1642b95b1" /> |
|---|---|

---

## Why Sway?

Group decisions usually often happen in messy chat threads with no clear outcome. Sway turns that into a simple, structured workflow:

- one link
- shared context
- real-time feedback
- clear signal on top preferences

Built mobile-first and optimized for instant sharing.

---

## Features

### Core
- Create boards with options (links, images, or text)
- Anonymous voting (one vote per user, movable)
- Emoji reactions and threaded comments per option
- Real-time updates across sessions

### Identity & Persistence (Phase 2)
- Magic link authentication (no passwords)
- Authenticated dashboard to manage created boards
- Boards created while signed in are tied to a user
- Persistent display names (localStorage + auth metadata)

### Phase 3: Productionalize _(backlog — collecting user feedback first)_

**Core:**
- Trending / browse page — public boards feed (`is_public` flag already in DB, no UI yet)
- Comment @replies / threading — flat comments today, needs `parent_id` + threaded UI
- Multiple photos per option — single `image_url` today, needs multi-image + carousel

**Nice-to-haves:**
- Board stats in dashboard (vote / reaction / comment counts per row)
- Email notification when a board closes
- Share OG card / download for social

### Lifecycle
- Auto-expiring boards (7 days)
- Optional paid extensions via Stripe

---

## Architecture

Sway is designed as a real-time system from the ground up, assuming active usage, scalable multi-user concurrency, and builtin monetization pathways.

- **Realtime sync** via Supabase channels
- **Postgres as source of truth** for all board state
- **Anonymous + authenticated hybrid model**
  - anonymous users can fully participate
  - auth adds persistence and ownership
- **Optimistic UI + live updates** for low-latency interactions

---

## Scaling Plan

The current stack (Vercel + Supabase) is sized for early traction and will comfortably handle thousands of concurrent boards. The plan below describes the migration path at each meaningful threshold — migrate only when a threshold is actually hit, not in advance.

| Threshold | Bottleneck | Action |
|-----------|-----------|--------|
| ~1k daily active users | None — current stack handles this trivially | Monitor only |
| Vercel bill > $50/mo | Serverless cold-starts + bandwidth | Move Next.js to a persistent runtime (Fly.io or Railway); eliminates cold-starts and cuts egress cost |
| Supabase bill > $50/mo | Realtime connection limits + row count | Upgrade to Supabase Pro or self-host Postgres on Railway; schema is standard SQL, no vendor lock-in |
| API latency > 300ms at peak | Compute + DB round-trip co-location | Deploy app and DB in the same region; Supabase supports region selection, Fly.io allows collocated instances |
| Realtime bottleneck | Supabase channels at scale | Swap Supabase Realtime for [Ably](https://ably.com) or self-hosted [Phoenix Channels](https://hexdocs.pm/phoenix/channels.html); no front-end rewrite needed, just the subscription layer |
| Need background workers | Vercel 60s function limit | Add a lightweight worker runtime (BullMQ on Railway, or Inngest) for things like expiry emails and board cleanup |

**What doesn't need to change:** the data model, auth flow, Stripe integration, and RLS policies all port cleanly to any Postgres host.

---

## Observability Plan

Observability is layered in as usage grows — no upfront tooling cost before there's signal worth watching.

### Layer 1 — Free / already available (now)
- **Vercel Analytics** — page views, Web Vitals (LCP, CLS, FID) per route; enable in project settings, zero code change
- **Supabase Dashboard** — slow query logs, connection pool usage, storage growth; built-in, no setup
- **Stripe Dashboard** — payment success/failure rates, dispute tracking

### Layer 2 — Add at first real traffic (~100+ DAU)
- **Error tracking** — [Sentry](https://sentry.io) (free tier covers ~5k errors/mo); wrap API routes and the Realtime subscription handler to surface JS exceptions with stack traces and user context
- **Structured server logs** — replace `console.error` calls in API routes with a lightweight logger ([pino](https://github.com/pinojs/pino)); forward to [Logtail](https://betterstack.com/logtail) or Vercel Log Drains for searchable retention
- **Uptime monitoring** — [Better Uptime](https://betterstack.com) or [UptimeRobot](https://uptimerobot.com) pinging `/api/health` (a trivial endpoint that queries Supabase) every 60s with SMS/email on failure

### Layer 3 — Add when scaling infra (~1k+ DAU or post-Vercel migration)
- **Metrics + dashboards** — [Grafana Cloud](https://grafana.com/products/cloud/) (free tier) with Prometheus scraping app metrics; key signals: p50/p95 API latency, Realtime subscriber count, board creation rate, Stripe checkout funnel
- **Distributed tracing** — [OpenTelemetry](https://opentelemetry.io) instrumentation on Next.js API routes; export to Grafana Tempo or Honeycomb to trace slow requests across DB + Realtime layers
- **Alerting** — PagerDuty or Grafana Alerting on: error rate > 1%, p95 latency > 500ms, Stripe webhook failures, Supabase pool exhaustion

### Key metrics to track from day one
| Metric | Why it matters |
|--------|---------------|
| Board creation rate | Primary growth signal |
| Boards with ≥1 vote | Engagement quality (boards that got shared) |
| Stripe checkout conversion | Revenue health |
| Realtime subscriber peak | Indicates viral/shared sessions |
| API error rate by route | Catches regressions before users report them |

---

## Tech Stack

- **Frontend**
  - Next.js 14 (App Router, Server Components)
  - Tailwind CSS

- **Backend / Data**
  - Supabase (PostgreSQL, Realtime, Auth, RLS)
  - Row Level Security for access control

- **Payments**
  - Stripe (board expiration extensions)

---

## Local Development

```bash
cp .env.local.example .env.local   # add Supabase + Stripe keys
npm install
npm run dev
