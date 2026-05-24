-- Migration: 20260525000002_create_tables
-- Core application tables.

-- Categories: can be global (user_id NULL, inserted by admin via service role)
-- or per-user (user_id set to the owning user).
CREATE TABLE IF NOT EXISTS categories (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  user_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Todos: always owned by a specific user.
CREATE TABLE IF NOT EXISTS todos (
  id          bigserial   PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text        text        NOT NULL,
  completed   boolean     NOT NULL DEFAULT false,
  category_id uuid        REFERENCES categories(id) ON DELETE SET NULL,
  due_date    date,
  created_at  timestamptz NOT NULL DEFAULT now()
);
