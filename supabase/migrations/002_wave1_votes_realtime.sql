-- Wave 1 migration: votes table + Realtime setup.
-- Run in Supabase SQL editor after 001_wave0.sql.

-- ─── votes ────────────────────────────────────────────────────────────────────
CREATE TABLE votes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id   uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  option_id  uuid NOT NULL REFERENCES options(id) ON DELETE CASCADE,
  user_id    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(board_id, user_id)  -- one vote per user per board; upsert moves it
);

ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votes_select" ON votes FOR SELECT USING (true);

CREATE INDEX votes_board_id_idx  ON votes(board_id);
CREATE INDEX votes_option_id_idx ON votes(option_id);

-- ─── Realtime ─────────────────────────────────────────────────────────────────
-- Enable postgres_changes for these tables.
ALTER PUBLICATION supabase_realtime ADD TABLE reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- REPLICA IDENTITY FULL is required so DELETE events carry the old row,
-- letting the client know which emoji/option was removed.
ALTER TABLE reactions REPLICA IDENTITY FULL;
ALTER TABLE votes     REPLICA IDENTITY FULL;
