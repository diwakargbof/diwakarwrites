-- Lock every table. Run this in the Supabase SQL editor.
--
-- ORDER MATTERS. Do these first, or the site loses its own database:
--
--   1. Supabase dashboard -> Project Settings -> API -> copy the
--      service_role key (the long one marked "secret").
--   2. Add SUPABASE_SERVICE_ROLE_KEY to Vercel (all environments) and to
--      .env.local.
--   3. Redeploy, and confirm the live site still loads /habits while
--      logged in. src/lib/db.ts picks the service-role key up
--      automatically; without it the server falls back to the anon key,
--      which the statements below are about to strip of all access.
--   4. Only then run this file.
--
-- Why this works: service_role bypasses RLS, so the server keeps full
-- access. The anon key does not, and with RLS on and no policies defined
-- it can read and write nothing. Since the anon key no longer ships to
-- the browser either, there is no path left from a visitor to this data.

ALTER TABLE board_posts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE books                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_expense_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_plans                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE films                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_cards              ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_holdings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_research           ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_entries               ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_library               ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE long_term_goals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE manuscripts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_sessions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE shows                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE writings                   ENABLE ROW LEVEL SECURITY;

-- Catch anything this file missed. Every row should read rls = true;
-- any 'false' is a table still readable by anyone with the anon key.
SELECT tablename, rowsecurity AS rls
  FROM pg_tables
 WHERE schemaname = 'public'
 ORDER BY rowsecurity, tablename;
