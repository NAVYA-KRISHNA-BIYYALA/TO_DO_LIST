-- Migration: envs/prod/20260525000001_prod_guards
-- Production hardening — run once after the base migrations.
-- No seed data. Focuses on safety, observability, and future-proofing.

-- ─────────────────────────────────────────────────────────────
-- 1. Revoke public schema access from anon / authenticated roles
--    Supabase grants these by default; restrict to explicit grants only.
-- ─────────────────────────────────────────────────────────────
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Re-grant only the minimum required for PostgREST to function with RLS:
GRANT SELECT, INSERT, UPDATE, DELETE ON todos       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON categories  TO authenticated;
GRANT SELECT                         ON categories  TO anon;

-- Allow sequences (needed for bigserial INSERT)
GRANT USAGE, SELECT ON SEQUENCE todos_id_seq TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. Enforce NOT NULL on user_id in todos (belt-and-suspenders)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE todos
  ALTER COLUMN user_id SET NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 3. Add a check constraint: due_date must not be in the past
--    on INSERT. Comment out if backdating is a valid use case.
-- ─────────────────────────────────────────────────────────────
-- ALTER TABLE todos
--   ADD CONSTRAINT chk_due_date_not_past
--   CHECK (due_date IS NULL OR due_date >= current_date);

-- ─────────────────────────────────────────────────────────────
-- 4. Confirm RLS is enabled on both tables (idempotent)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE todos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos       FORCE  ROW LEVEL SECURITY;
ALTER TABLE categories  FORCE  ROW LEVEL SECURITY;
-- FORCE RLS makes policies apply to the table owner too (extra safety).

-- ─────────────────────────────────────────────────────────────
-- 5. Verify policy count before finishing
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  policy_count int;
BEGIN
  SELECT count(*) INTO policy_count
  FROM pg_policies
  WHERE tablename IN ('todos', 'categories');

  IF policy_count < 8 THEN
    RAISE EXCEPTION 'Expected at least 8 RLS policies, found %. Run 20260525000004_rls_policies.sql first.', policy_count;
  END IF;
END $$;
