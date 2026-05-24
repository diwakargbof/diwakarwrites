-- ── Finance: Portfolio Holdings ────────────────────────────────────────────
create table if not exists finance_holdings (
  id           uuid default gen_random_uuid() primary key,
  symbol       text not null,           -- e.g. 'RELIANCE.NS', '^NSEI', 'AAPL'
  name         text not null,           -- display name
  units        numeric not null,
  buy_price    numeric not null,
  buy_currency text not null default 'INR',   -- 'INR' or 'USD'
  asset_type   text not null default 'stock', -- stock | etf | mf | index | crypto
  created_at   timestamptz default now()
);

-- ── Finance: Adaptive Learning Cards ────────────────────────────────────────
create table if not exists finance_cards (
  id                uuid default gen_random_uuid() primary key,
  concept           text not null,           -- short title e.g. "What is a Stock?"
  content           text not null,           -- lesson body (markdown)
  key_takeaway      text,                    -- one-liner that sticks
  estimated_minutes integer default 5,
  read_at           timestamptz,             -- null = current unread card
  created_at        timestamptz default now()
);

-- ── Finance: Daily AI Market Research Briefs ────────────────────────────────
create table if not exists finance_research (
  id          uuid default gen_random_uuid() primary key,
  date        date not null unique,
  brief       text not null,               -- AI-generated daily commentary
  market_data jsonb,                       -- snapshot of prices used
  created_at  timestamptz default now()
);
