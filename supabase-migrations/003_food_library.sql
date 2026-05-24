-- ── Food Library: saved foods for quick re-use ─────────────────────────────
create table if not exists food_library (
  id           uuid default gen_random_uuid() primary key,
  name         text not null,           -- display name e.g. "Oats with milk"
  serving_desc text,                    -- e.g. "1 bowl", "100g", "2 pieces"
  calories     integer not null,
  protein_g    integer not null default 0,
  fiber_g      integer not null default 0,
  use_count    integer not null default 0,  -- incremented on each quick-add
  created_at   timestamptz default now()
);
