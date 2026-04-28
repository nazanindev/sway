-- Wave 1 fix: create the payments table referenced by /api/checkout and /api/webhook

CREATE TABLE IF NOT EXISTS payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id        uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  stripe_session_id text NOT NULL UNIQUE,
  amount_cents    integer NOT NULL,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Index for webhook lookups by stripe_session_id
CREATE INDEX IF NOT EXISTS payments_stripe_session_id_idx ON payments(stripe_session_id);

-- RLS: service role only (no public reads needed)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
