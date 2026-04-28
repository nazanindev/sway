-- Wave 2: Auth — link boards to Supabase auth users
ALTER TABLE boards
  ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_boards_creator_id ON boards(creator_id);
