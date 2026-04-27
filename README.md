# Sway

A lightweight real-time polling app. Create a board, add options, and let people vote, react, and comment — no account required.

## Features

- Create polls with links and images per option
- One vote per user (stored by anonymous ID), moveable
- Emoji reactions and comments per option
- Live updates across sessions via Supabase Realtime
- Boards expire after 7 days; pay to extend

## Stack

- **Next.js 14** (App Router, server components)
- **Supabase** — Postgres, Realtime, Row Level Security
- **Tailwind CSS**
- **Stripe** — board extensions

## Running locally

```bash
cp .env.local.example .env.local   # fill in Supabase + Stripe keys
npm install
npm run dev
```

Apply migrations in `supabase/migrations/` via the Supabase SQL editor, then open [http://localhost:3000](http://localhost:3000).
