# Sway

A lightweight real-time app for group decision-making. Create a board, share options, and collect votes, reactions, and comments — no account required.

## Features

- Create boards with options (links, images, text)
- Anonymous voting (one vote per user, moveable)
- Emoji reactions and threaded comments per option
- Real-time updates across sessions via Supabase Realtime
- Auto-expiring boards (7 days) with optional paid extensions

## Tech Stack

- **Next.js 14** (App Router, Server Components)
- **Supabase** — Postgres, Realtime, Row Level Security
- **Tailwind CSS**
- **Stripe** — payments for board extensions

## Local Development

```bash
cp .env.local.example .env.local   # add Supabase + Stripe keys
npm install
npm run dev
