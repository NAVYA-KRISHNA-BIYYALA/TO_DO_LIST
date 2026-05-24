-- rls-tests.sql
-- Validate Row Level Security policies in the Supabase SQL Editor or psql.
--
-- HOW TO USE:
--   1. Create two test users in the Supabase Auth dashboard and note their UUIDs.
--   2. Replace USER_A_UUID and USER_B_UUID throughout this file.
--   3. Run each BEGIN/ROLLBACK block individually. Every block rolls back, so
--      no permanent data is written.
--   4. Verify the result comments at the bottom of each block match actual output.
--
-- NOTE: SET LOCAL ROLE and set_config work within an explicit transaction in
-- the Supabase SQL Editor. If a block errors on role switching, run it via psql
-- or use the curl-examples.sh approach instead.

-- ────────────────────────────────────────────────────────────
-- PLACEHOLDER SUBSTITUTION
-- Replace these two values before running:
-- ────────────────────────────────────────────────────────────
-- USER_A_UUID = 11111111-1111-1111-1111-111111111111
-- USER_B_UUID = 22222222-2222-2222-2222-222222222222

-- ════════════════════════════════════════════════════════════
-- 0. SANITY CHECK — confirm policies exist
-- ════════════════════════════════════════════════════════════
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('todos', 'categories')
ORDER BY tablename, cmd;
-- Expected: 8 rows (4 per table: SELECT, INSERT, UPDATE, DELETE)

-- ════════════════════════════════════════════════════════════
-- 1. TODOS — SELECT: user sees only own rows
-- ════════════════════════════════════════════════════════════
BEGIN;
  INSERT INTO todos (user_id, text, completed)
  VALUES
    ('11111111-1111-1111-1111-111111111111', 'User A todo', false),
    ('22222222-2222-2222-2222-222222222222', 'User B todo', false);

  -- Authenticate as user_a
  SELECT set_config('request.jwt.claims',
    '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;

  SELECT id, text, user_id FROM todos;
  -- Expected: only 'User A todo'; 'User B todo' is hidden by RLS
ROLLBACK;

-- ════════════════════════════════════════════════════════════
-- 2. TODOS — SELECT: explicit cross-user WHERE returns 0 rows
-- ════════════════════════════════════════════════════════════
BEGIN;
  INSERT INTO todos (user_id, text, completed)
  VALUES ('11111111-1111-1111-1111-111111111111', 'User A secret', false);

  SELECT set_config('request.jwt.claims',
    '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;

  SELECT * FROM todos WHERE user_id = '11111111-1111-1111-1111-111111111111';
  -- Expected: 0 rows — RLS filter overrides explicit WHERE
ROLLBACK;

-- ════════════════════════════════════════════════════════════
-- 3. TODOS — INSERT: user can insert with own user_id
-- ════════════════════════════════════════════════════════════
BEGIN;
  SELECT set_config('request.jwt.claims',
    '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;

  INSERT INTO todos (user_id, text, completed)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Legitimate insert', false);
  -- Expected: INSERT 0 1
ROLLBACK;

-- ════════════════════════════════════════════════════════════
-- 4. TODOS — INSERT: user CANNOT insert with another user's id
-- ════════════════════════════════════════════════════════════
BEGIN;
  SELECT set_config('request.jwt.claims',
    '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;

  INSERT INTO todos (user_id, text, completed)
  VALUES ('22222222-2222-2222-2222-222222222222', 'Hijacked insert', false);
  -- Expected: ERROR 42501 — new row violates row-level security policy "insert_user"
ROLLBACK;

-- ════════════════════════════════════════════════════════════
-- 5. TODOS — UPDATE: user can update own row
-- ════════════════════════════════════════════════════════════
BEGIN;
  -- Seed as superuser (bypasses RLS)
  INSERT INTO todos (user_id, text, completed)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Pending task', false);

  SELECT set_config('request.jwt.claims',
    '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;

  UPDATE todos SET completed = true WHERE text = 'Pending task';
  -- Expected: UPDATE 1

  SELECT completed FROM todos WHERE text = 'Pending task';
  -- Expected: true
ROLLBACK;

-- ════════════════════════════════════════════════════════════
-- 6. TODOS — UPDATE: user CANNOT update another user's row
-- ════════════════════════════════════════════════════════════
BEGIN;
  INSERT INTO todos (user_id, text, completed)
  VALUES ('11111111-1111-1111-1111-111111111111', 'User A task', false);

  SELECT set_config('request.jwt.claims',
    '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;

  UPDATE todos SET completed = true WHERE text = 'User A task';
  -- Expected: UPDATE 0 — row not visible to user_b
ROLLBACK;

-- ════════════════════════════════════════════════════════════
-- 7. TODOS — DELETE: user can delete own row
-- ════════════════════════════════════════════════════════════
BEGIN;
  INSERT INTO todos (user_id, text, completed)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Deletable task', false);

  SELECT set_config('request.jwt.claims',
    '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;

  DELETE FROM todos WHERE text = 'Deletable task';
  -- Expected: DELETE 1
ROLLBACK;

-- ════════════════════════════════════════════════════════════
-- 8. TODOS — DELETE: user CANNOT delete another user's row
-- ════════════════════════════════════════════════════════════
BEGIN;
  INSERT INTO todos (user_id, text, completed)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Protected task', false);

  SELECT set_config('request.jwt.claims',
    '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;

  DELETE FROM todos WHERE text = 'Protected task';
  -- Expected: DELETE 0
ROLLBACK;

-- ════════════════════════════════════════════════════════════
-- 9. CATEGORIES — SELECT: public categories visible to all users
-- ════════════════════════════════════════════════════════════
BEGIN;
  INSERT INTO categories (name, user_id) VALUES ('Global Category', NULL);

  SELECT set_config('request.jwt.claims',
    '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;

  SELECT name, user_id FROM categories WHERE name = 'Global Category';
  -- Expected: 1 row with user_id = NULL
ROLLBACK;

-- ════════════════════════════════════════════════════════════
-- 10. CATEGORIES — SELECT: user CANNOT see another user's categories
-- ════════════════════════════════════════════════════════════
BEGIN;
  INSERT INTO categories (name, user_id)
  VALUES ('User A Private Cat', '11111111-1111-1111-1111-111111111111');

  SELECT set_config('request.jwt.claims',
    '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;

  SELECT name FROM categories WHERE name = 'User A Private Cat';
  -- Expected: 0 rows
ROLLBACK;

-- ════════════════════════════════════════════════════════════
-- 11. CATEGORIES — INSERT: user CANNOT create a public category (user_id NULL)
-- ════════════════════════════════════════════════════════════
BEGIN;
  SELECT set_config('request.jwt.claims',
    '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;

  INSERT INTO categories (name, user_id) VALUES ('Fake Global', NULL);
  -- Expected: ERROR 42501 — new row violates row-level security policy "insert_owned"
ROLLBACK;

-- ════════════════════════════════════════════════════════════
-- 12. CATEGORIES — UPDATE: user CANNOT change another user's category
-- ════════════════════════════════════════════════════════════
BEGIN;
  INSERT INTO categories (name, user_id)
  VALUES ('User A Cat', '11111111-1111-1111-1111-111111111111');

  SELECT set_config('request.jwt.claims',
    '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;

  UPDATE categories SET name = 'Hijacked' WHERE name = 'User A Cat';
  -- Expected: UPDATE 0
ROLLBACK;

-- ════════════════════════════════════════════════════════════
-- 13. ANON role — no access to todos
-- ════════════════════════════════════════════════════════════
BEGIN;
  INSERT INTO todos (user_id, text, completed)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Anon test todo', false);

  SET LOCAL ROLE anon;

  SELECT * FROM todos;
  -- Expected: 0 rows — no RLS policy grants anon SELECT on todos
ROLLBACK;

-- ════════════════════════════════════════════════════════════
-- 14. SERVICE ROLE — bypasses RLS (verify bypass works)
-- ════════════════════════════════════════════════════════════
-- Run as postgres/service_role (default in SQL editor):
BEGIN;
  INSERT INTO todos (user_id, text, completed)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Service role todo', false);

  -- service_role bypasses RLS, so this should return all rows
  SELECT count(*) FROM todos;
  -- Expected: includes the row above regardless of auth context
ROLLBACK;
