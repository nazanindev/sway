-- Wave 0 migration: run this against your existing Supabase database.

-- 1. Remove the hardcoded emoji CHECK constraint so any emoji text is allowed.
--    The allowed set is now enforced in the API layer (app/api/reactions/route.ts).
ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_emoji_check;

-- 2. Add emoji_set to boards (stores the ordered emoji set for this board).
--    Defaults to the new Wave 0 set. Wave 1 will expose this in the creation UI.
ALTER TABLE boards
  ADD COLUMN IF NOT EXISTS emoji_set text[] NOT NULL DEFAULT ARRAY['❤️','🔥','🤔','❌'];

-- 3. Add is_public flag for future trending/browse page (no UI yet).
ALTER TABLE boards
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
