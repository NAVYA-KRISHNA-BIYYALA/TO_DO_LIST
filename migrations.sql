-- migrations.sql
-- Run this in Supabase SQL editor or via psql to create tables and RLS policies.
-- NOTE: Replace or adapt types if you prefer bigint UUIDs, etc.

-- Enable pgcrypto for gen_random_uuid()
create extension if not exists pgcrypto;

-- Categories: can be global (user_id NULL) or per-user (user_id set)
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Todos: owned by a user
CREATE TABLE IF NOT EXISTS todos (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  text text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  due_date date,
  created_at timestamptz DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos (user_id);
CREATE INDEX IF NOT EXISTS idx_todos_category_id ON todos (category_id);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos (due_date);

-- ----------------------
-- Row Level Security (RLS) policies
-- ----------------------

-- Categories RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Allow users to SELECT categories that are public (user_id IS NULL) or owned by them
CREATE POLICY "select_public_or_owned" ON categories
  FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());

-- Allow authenticated users to create categories tied to themselves
CREATE POLICY "insert_owned" ON categories
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow owners to update/delete their categories
CREATE POLICY "update_owned" ON categories
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete_owned" ON categories
  FOR DELETE
  USING (user_id = auth.uid());

-- Todos RLS
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Only allow selecting todos belonging to the current user
CREATE POLICY "select_user" ON todos
  FOR SELECT
  USING (user_id = auth.uid());

-- Allow inserting todos only when user_id == auth.uid()
CREATE POLICY "insert_user" ON todos
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow updates only by the owner; ensure user_id remains the owner
CREATE POLICY "update_user" ON todos
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow deletes only by the owner
CREATE POLICY "delete_user" ON todos
  FOR DELETE
  USING (user_id = auth.uid());

-- Optional: If you use Supabase Functions or server-side logic that acts as a service
-- account, you may create separate policies or bypass RLS via service_role keys.

-- End of migrations.sql
