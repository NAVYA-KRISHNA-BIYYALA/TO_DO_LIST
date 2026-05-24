-- Migration: envs/dev/20260525000001_seed_data
-- Development-only seed data. DO NOT run in staging or production.
--
-- Creates two test users (via auth.users insert requires service role or
-- admin API — use the Supabase dashboard or CLI for real users).
-- This script inserts categories and todos assuming the users already exist.
--
-- Replace DEV_USER_A_UUID / DEV_USER_B_UUID with UUIDs from your dev project.

DO $$
DECLARE
  user_a uuid := '11111111-1111-1111-1111-111111111111';
  user_b uuid := '22222222-2222-2222-2222-222222222222';
  cat_inbox  uuid;
  cat_work   uuid;
  cat_personal uuid;
BEGIN

  -- ── Global categories (visible to all users, no owner) ──────────────────
  -- Only a service-role migration can set user_id = NULL.
  INSERT INTO categories (name, user_id) VALUES
    ('Inbox',    NULL),
    ('Work',     NULL),
    ('Personal', NULL)
  ON CONFLICT DO NOTHING
  RETURNING id INTO cat_inbox;

  SELECT id INTO cat_inbox    FROM categories WHERE name = 'Inbox'    AND user_id IS NULL;
  SELECT id INTO cat_work     FROM categories WHERE name = 'Work'     AND user_id IS NULL;
  SELECT id INTO cat_personal FROM categories WHERE name = 'Personal' AND user_id IS NULL;

  -- ── Todos for user_a ──────────────────────────────────────────────────
  INSERT INTO todos (user_id, text, completed, category_id, due_date) VALUES
    (user_a, 'Set up local dev environment', true,  cat_inbox,    current_date - 2),
    (user_a, 'Review onboarding docs',       false, cat_work,     current_date + 1),
    (user_a, 'Write unit tests',             false, cat_work,     current_date + 3),
    (user_a, 'Buy groceries',                false, cat_personal, current_date),
    (user_a, 'Call dentist',                 false, cat_personal, current_date + 7)
  ON CONFLICT DO NOTHING;

  -- ── Todos for user_b ──────────────────────────────────────────────────
  INSERT INTO todos (user_id, text, completed, category_id, due_date) VALUES
    (user_b, 'Read product brief',  false, cat_work,     current_date),
    (user_b, 'Schedule team sync',  false, cat_work,     current_date + 2),
    (user_b, 'Pay electricity bill',false, cat_personal, current_date + 5)
  ON CONFLICT DO NOTHING;

END $$;
