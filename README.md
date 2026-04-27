# Sway

A lightweight real-time app for group decision-making. Create a board, share options, and collect votes, reactions, and comments — no account required.

## Demo
**🔗 Live Demo** https://sway-tan.vercel.app/

|<img width="325" height="500" alt="image" src="https://github.com/user-attachments/assets/3b30502b-5150-4f1b-bec2-9107aad8b9e8" /> |<img width="325" height="500" alt="image" src="https://github.com/user-attachments/assets/d658215a-83a0-4e0c-a493-46481d71fc5d" /> | 
|---|---|

## Why Sway?

Group decisions often live in messy chat threads, with scattered links and opinions.

Sway is a lightweight, mobile-first tool designed for instant sharing — turning that chaos into a simple, structured workflow.

## Features

- Create boards with options (links, images, or text)
- Anonymous voting (one vote per user, movable)
- Emoji reactions and threaded comments per option
- Real-time updates across sessions via Supabase Realtime
- Auto-expiring boards (7 days) with optional paid extensions

## Tech Stack

- **Next.js 14** (App Router, Server Components)
- **Supabase** — Postgres, Realtime, Row Level Security
- **Tailwind CSS**
- **Stripe** — payments for board extensions

Built as a real-time system using Supabase for synchronization, with anonymous identity tracking and state persisted in Postgres.

## Local Development

```bash
cp .env.local.example .env.local   # add Supabase + Stripe keys
npm install
npm run dev
