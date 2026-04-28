# Sway

A lightweight real-time app for group decision-making.

Create a board, share options, and collect votes, reactions, and comments — no account required.

## Demo
**🔗 Live Demo** https://sway-tan.vercel.app/

|<img width="325" height="500" alt="image" src="https://github.com/user-attachments/assets/3b30502b-5150-4f1b-bec2-9107aad8b9e8" /> |<img width="325" height="500" alt="image" src="https://github.com/user-attachments/assets/d658215a-83a0-4e0c-a493-46481d71fc5d" /> |
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
