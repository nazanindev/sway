-- README / marketing demo: apartment shortlist with a non-default reaction emoji set.
-- Stable board id → /b/a0000000-0000-4000-8000-000000000001
-- Safe to re-run: upserts the board and replaces its options only.

INSERT INTO public.boards (id, title, description, edit_token, expires_at, emoji_set, is_public, creator_id)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'Which apartment?',
  'Shortlist for the lease — compare reactions + vote.',
  '0000000000000000000000000000000000000000000000000000000000000demo',
  (now() + interval '365 days'),
  ARRAY['❤️', '👍', '🤷', '👎']::text[],
  true,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  emoji_set = EXCLUDED.emoji_set,
  expires_at = EXCLUDED.expires_at,
  is_public = EXCLUDED.is_public;

DELETE FROM public.options WHERE board_id = 'a0000000-0000-4000-8000-000000000001';

INSERT INTO public.options (board_id, title, image_url, link_url, notes, position) VALUES
  (
    'a0000000-0000-4000-8000-000000000001',
    'The Elm on Main',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&q=80',
    'https://www.zillow.com/',
    '2 bed, laundry in unit',
    0
  ),
  (
    'a0000000-0000-4000-8000-000000000001',
    'Riverfront Lofts',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=80',
    'https://www.zillow.com/',
    'Top floor, parking',
    1
  ),
  (
    'a0000000-0000-4000-8000-000000000001',
    'Parkview Studio',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&q=80',
    'https://www.zillow.com/',
    'Budget-friendly, walkable',
    2
  );
