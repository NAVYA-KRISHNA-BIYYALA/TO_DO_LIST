-- Migration: envs/staging/20260525000001_seed_data
-- Staging-only seed data.
-- Creates a minimal, realistic dataset for QA and integration testing.
-- Safe to re-run (uses ON CONFLICT DO NOTHING).
--
-- Replace STAGING_QA_USER_UUID with the UUID of the QA test account in
-- your staging Supabase project.

DO $$
DECLARE
  qa_user uuid := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  cat_inbox    uuid;
  cat_work     uuid;
BEGIN

  -- Global categories for staging
  INSERT INTO categories (name, user_id) VALUES
    ('Inbox',  NULL),
    ('Work',   NULL)
  ON CONFLICT DO NOTHING;

  SELECT id INTO cat_inbox FROM categories WHERE name = 'Inbox' AND user_id IS NULL;
  SELECT id INTO cat_work  FROM categories WHERE name = 'Work'  AND user_id IS NULL;

  -- Minimal todos for the QA user
  INSERT INTO todos (user_id, text, completed, category_id, due_date) VALUES
    (qa_user, '[QA] Smoke test — add todo',    false, cat_inbox, current_date),
    (qa_user, '[QA] Smoke test — complete',    false, cat_work,  current_date + 1),
    (qa_user, '[QA] Smoke test — delete',      false, cat_inbox, current_date + 2),
    (qa_user, '[QA] Filter by today',          false, cat_work,  current_date),
    (qa_user, '[QA] Filter by upcoming',       false, cat_work,  current_date + 5),
    (qa_user, '[QA] Completed task',           true,  cat_inbox, current_date - 1)
  ON CONFLICT DO NOTHING;

END $$;
