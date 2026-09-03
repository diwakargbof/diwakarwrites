-- Run this in the Supabase SQL editor.
--
-- Splits the site into a private half (everything) and a public half
-- (the board + writing explicitly marked public).

-- ── Board: threads, ownership, visibility ───────────────────────────

ALTER TABLE board_posts
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES board_posts(id) ON DELETE CASCADE;

ALTER TABLE board_posts
  ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT false;

-- 'private' = only Diwakar sees it. Visitors' posts are always 'public'.
ALTER TABLE board_posts
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('public', 'private'));

CREATE INDEX IF NOT EXISTS board_posts_parent_idx ON board_posts(parent_id);
CREATE INDEX IF NOT EXISTS board_posts_created_idx ON board_posts(created_at);

-- Existing notes signed "Diwakar" are his, and are hidden from visitors.
-- Drop or edit this if you want some of the old ones to stay visible.
UPDATE board_posts
   SET is_owner = true, visibility = 'private'
 WHERE name ILIKE 'diwakar';

-- ── Writings: a separate "the world may read this" flag ─────────────
-- `published` still means "finished" in the private hub. `is_public` is
-- what actually puts a piece on the public site.

ALTER TABLE writings
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS writings_public_idx ON writings(is_public, created_at DESC);


-- Locking the tables down with RLS is a separate, later step:
-- see 005_enable_rls.sql. Do that one only after the server has a
-- service-role key, or the site loses its own database.
