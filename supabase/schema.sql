-- Run this in your Supabase SQL editor to set up the schema.

create extension if not exists "pgcrypto";

-- ─── boards ───────────────────────────────────────────────────────────────────
create table boards (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  edit_token  text not null unique default encode(gen_random_bytes(32), 'hex'),
  expires_at  timestamptz not null default (now() + interval '7 days'),
  emoji_set   text[] not null default array['❤️','🔥','🤔','❌'],
  is_public   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ─── options ──────────────────────────────────────────────────────────────────
create table options (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references boards(id) on delete cascade,
  title      text not null,
  image_url  text,
  link_url   text,
  notes      text,
  position   smallint not null default 0,
  created_at timestamptz not null default now()
);

-- ─── reactions ────────────────────────────────────────────────────────────────
create table reactions (
  id         uuid primary key default gen_random_uuid(),
  option_id  uuid not null references options(id) on delete cascade,
  emoji      text not null,  -- validated in API layer
  user_id    text not null,  -- localStorage UUID
  created_at timestamptz not null default now(),
  unique (option_id, user_id, emoji)
);

-- ─── comments ─────────────────────────────────────────────────────────────────
create table comments (
  id         uuid primary key default gen_random_uuid(),
  option_id  uuid not null references options(id) on delete cascade,
  user_name  text,
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

-- ─── payments ─────────────────────────────────────────────────────────────────
create table payments (
  id                uuid primary key default gen_random_uuid(),
  board_id          uuid not null references boards(id) on delete cascade,
  stripe_session_id text not null unique,
  amount_cents      int not null,
  status            text not null default 'pending',
  created_at        timestamptz not null default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- All writes go through server-side API routes using the service role key,
-- so public access is read-only on non-sensitive columns.

alter table boards    enable row level security;
alter table options   enable row level security;
alter table reactions enable row level security;
alter table comments  enable row level security;
alter table payments  enable row level security;

-- Boards: anyone can read; no direct client writes (API route handles inserts)
create policy "boards_select" on boards for select using (true);

-- Options: anyone can read
create policy "options_select" on options for select using (true);

-- Reactions: anyone can read
create policy "reactions_select" on reactions for select using (true);

-- Comments: anyone can read
create policy "comments_select" on comments for select using (true);

-- Payments: nobody reads directly (service role only)
-- (no select policy → denied for anon/authenticated)

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index options_board_id_idx    on options(board_id);
create index reactions_option_id_idx on reactions(option_id);
create index comments_option_id_idx  on comments(option_id);
create index payments_board_id_idx   on payments(board_id);
