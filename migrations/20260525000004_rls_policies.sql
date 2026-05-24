-- Migration: 20260525000004_rls_policies
-- Row Level Security policies for categories and todos.
-- Run after 20260525000002_create_tables.sql.

-- ─────────────────────────────────────
-- Categories
-- ─────────────────────────────────────
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- SELECT: public categories (user_id IS NULL) and own categories
CREATE POLICY "select_public_or_owned" ON categories
  FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());

-- INSERT: authenticated users may only create categories tied to themselves
CREATE POLICY "insert_owned" ON categories
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: owners only; user_id cannot be changed
CREATE POLICY "update_owned" ON categories
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: owners only
CREATE POLICY "delete_owned" ON categories
  FOR DELETE
  USING (user_id = auth.uid());

-- ─────────────────────────────────────
-- Todos
-- ─────────────────────────────────────
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- SELECT: only own todos
CREATE POLICY "select_user" ON todos
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: must match authenticated user
CREATE POLICY "insert_user" ON todos
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: owner only; user_id cannot be reassigned
CREATE POLICY "update_user" ON todos
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: owner only
CREATE POLICY "delete_user" ON todos
  FOR DELETE
  USING (user_id = auth.uid());
